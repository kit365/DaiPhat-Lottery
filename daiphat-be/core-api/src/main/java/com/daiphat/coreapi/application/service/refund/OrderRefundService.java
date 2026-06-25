package com.daiphat.coreapi.application.service.refund;

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
import com.daiphat.coreapi.application.service.refund.OrderRefundGraceService.RefundGraceEvaluation;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final OrderRefundGraceService orderRefundGraceService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public RefundRequestResponse refundPaidOrder(UUID orderId, UUID customerId, CreateOrderRefundRequest request) {
        log.info("Customer {} requesting refund for order {}", customerId, orderId);

        OrderModel order = orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (!customerId.equals(order.getUserId())) {
            throw new DomainException(ErrorCode.ACCESS_DENIED);
        }

        ensureRefundEligible(order);

        UserBankAccountModel bankAccount = userBankAccountRepositoryPort
                .findByIdAndUserId(request.bankAccountId(), customerId)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_BANK_ACCOUNT_MISMATCH));

        String reason = request.refundReason().trim();
        BigDecimal refundAmount = calculateRefundAmount(order);

        if (order.getStatus() == OrderStatus.PREPARING) {
            RefundRequestModel refundRequest = RefundRequestModel.builder()
                    .refundType(RefundType.FULL_ORDER)
                    .orderId(orderId)
                    .requestedBy(customerId)
                    .requestRole(RefundRequestRole.CUSTOMER)
                    .refundAmount(refundAmount)
                    .refundReason(reason)
                    .bankAccountId(bankAccount.getId())
                    .build();
            refundRequest.initializeForCreate();

            RefundRequestModel savedRefund = refundRequestRepositoryPort.save(refundRequest);
            return refundApplicationMapper.toRefundResponse(savedRefund, bankAccount);
        }

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

        cancelOrderForCustomerRefund(order, reason);
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

        RefundGraceEvaluation evaluation = orderRefundGraceService.evaluate(order);
        return new OrderRefundEligibilityResponse(
                evaluation.eligible(),
                evaluation.reason(),
                evaluation.remainingSeconds(),
                evaluation.graceMinutes(),
                evaluation.refundDeadlineAt());
    }

    private void ensureRefundEligible(OrderModel order) {
        RefundGraceEvaluation evaluation = orderRefundGraceService.evaluate(order);
        if (!evaluation.eligible()) {
            throw new DomainException(ErrorCode.REFUND_WINDOW_EXPIRED, evaluation.reason());
        }
    }

    private void cancelOrderForCustomerRefund(OrderModel order, String cancelReason) {
        if (order.getOrderType() == OrderType.DIRECT) {
            order.cancelDirectOrder(cancelReason);
            return;
        }
        if (order.getStatus() == OrderStatus.PAID) {
            order.cancelByCustomerRefund(cancelReason);
            return;
        }
        order.cancelAfterPayment(cancelReason);
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
