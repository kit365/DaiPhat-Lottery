package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.config.OrderRefundProperties;
import com.daiphat.coreapi.application.dto.request.refund.CreateOrderRefundRequest;
import com.daiphat.coreapi.application.dto.response.refund.OrderRefundEligibilityResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.refund.OrderRefundServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderRefundService implements OrderRefundServicePort {

    private final OrderRepositoryPort orderRepositoryPort;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final RefundApplicationMapper refundApplicationMapper;
    private final OrderRefundProperties orderRefundProperties;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public RefundRequestResponse refundPaidOrder(UUID orderId, UUID customerId, CreateOrderRefundRequest request) {
        log.info("Customer {} requesting refund for paid order {}", customerId, orderId);

        OrderModel order = orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (!customerId.equals(order.getUserId())) {
            throw new DomainException(ErrorCode.ACCESS_DENIED);
        }

        validateRefundEligibility(order);

        UserBankAccountModel bankAccount = userBankAccountRepositoryPort
                .findByIdAndUserId(request.bankAccountId(), customerId)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_BANK_ACCOUNT_MISMATCH));

        String reason = request.refundReason().trim();
        BigDecimal refundAmount = calculateRefundAmount(order);

        RefundRequestModel refundRequest = RefundRequestModel.builder()
                .refundType(RefundType.FULL_ORDER)
                .orderId(orderId)
                .requestedBy(customerId)
                .requestRole(RefundRequestRole.CUSTOMER)
                .refundAmount(refundAmount)
                .refundReason(reason)
                .bankAccountId(bankAccount.getId())
                .build();
        refundRequest.initializeForAutoApprovedCancel();

        RefundRequestModel savedRefund = refundRequestRepositoryPort.save(refundRequest);

        order.cancelByCustomerRefund(reason);
        releaseSoldTickets(order);
        orderRepositoryPort.save(order);

        publishOrderCancelled(order);

        return refundApplicationMapper.toRefundResponse(savedRefund, bankAccount);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderRefundEligibilityResponse getRefundEligibility(UUID orderId, UUID customerId) {
        OrderModel order = orderRepositoryPort.findById(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (!customerId.equals(order.getUserId())) {
            throw new DomainException(ErrorCode.ACCESS_DENIED);
        }

        try {
            validateRefundEligibility(order);
            LocalDateTime paidAt = resolvePaidAt(order);
            long remainingSeconds = computeRemainingSeconds(paidAt);
            return new OrderRefundEligibilityResponse(
                    true,
                    null,
                    remainingSeconds,
                    orderRefundProperties.getClosingTime().toString());
        } catch (DomainException ex) {
            return new OrderRefundEligibilityResponse(
                    false,
                    ex.getMessage(),
                    null,
                    orderRefundProperties.getClosingTime().toString());
        }
    }

    private void validateRefundEligibility(OrderModel order) {
        if (order.getStatus() != OrderStatus.PAID) {
            throw new DomainException(ErrorCode.REFUND_ORDER_NOT_PAID);
        }

        if (refundRequestRepositoryPort.existsActiveByOrderId(order.getId())) {
            throw new DomainException(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
        }

        ZonedDateTime now = ZonedDateTime.now(ZoneId.of(orderRefundProperties.getTimezone()));
        if (!now.toLocalTime().isBefore(orderRefundProperties.getClosingTime())) {
            throw new DomainException(ErrorCode.REFUND_WINDOW_CLOSED);
        }

        LocalDateTime paidAt = resolvePaidAt(order);
        Duration elapsed = Duration.between(paidAt, now.toLocalDateTime());
        if (elapsed.toMinutes() >= orderRefundProperties.getWindowMinutes()) {
            throw new DomainException(ErrorCode.REFUND_WINDOW_EXPIRED);
        }
    }

    private LocalDateTime resolvePaidAt(OrderModel order) {
        if (order.getTransactions() != null) {
            LocalDateTime fromTx = order.getTransactions().stream()
                    .filter(tx -> tx.getStatus() == TransactionStatus.COMPLETED)
                    .map(TransactionModel::getPaidAt)
                    .filter(paidAt -> paidAt != null)
                    .max(Comparator.naturalOrder())
                    .orElse(null);
            if (fromTx != null) {
                return fromTx;
            }
        }
        if (order.getUpdatedAt() != null) {
            return order.getUpdatedAt();
        }
        return order.getCreatedAt();
    }

    private long computeRemainingSeconds(LocalDateTime paidAt) {
        if (paidAt == null) {
            return 0L;
        }
        LocalDateTime deadline = paidAt.plusMinutes(orderRefundProperties.getWindowMinutes());
        long seconds = Duration.between(LocalDateTime.now(), deadline).getSeconds();
        return Math.max(seconds, 0L);
    }

    private BigDecimal calculateRefundAmount(OrderModel order) {
        if (order.getOrderDetails() != null && !order.getOrderDetails().isEmpty()) {
            return order.getOrderDetails().stream()
                    .map(OrderDetailModel::getPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        if (order.getTotalAmount() == null || order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_AMOUNT);
        }
        return order.getTotalAmount();
    }

    private void releaseSoldTickets(OrderModel order) {
        if (order.getOrderDetails() == null) {
            return;
        }
        for (OrderDetailModel detail : order.getOrderDetails()) {
            if (detail.getLotteryTicketSerialId() != null) {
                lotteryTicketServicePort.returnSoldTicketForOrder(detail.getLotteryTicketSerialId());
            }
        }
    }

    private void publishOrderCancelled(OrderModel order) {
        if (order.getId() == null || order.getUserId() == null || order.getStatus() == null) {
            return;
        }
        eventPublisher.publishEvent(OrderStatusChangedEvent.builder()
                .orderId(order.getId())
                .customerId(order.getUserId())
                .orderCode(order.getOrderCode())
                .status(order.getStatus())
                .build());
    }
}
