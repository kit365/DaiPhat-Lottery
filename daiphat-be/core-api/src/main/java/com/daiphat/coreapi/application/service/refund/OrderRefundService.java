package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.request.refund.CreateOrderRefundRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.refund.OrderRefundEligibilityResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundEligibleTicketItemResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.refund.OrderRefundServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.service.refund.OrderRefundGraceService.RefundGraceEvaluation;
import com.daiphat.coreapi.application.service.refund.OrderRefundPolicyService.PolicyEvaluation;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderRefundService implements OrderRefundServicePort {

    private final OrderRepositoryPort orderRepositoryPort;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort;
    private final RefundApplicationMapper refundApplicationMapper;
    private final OrderRefundGraceService orderRefundGraceService;
    private final OrderRefundPolicyService orderRefundPolicyService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public RefundRequestResponse refundPaidOrder(UUID orderId, UUID customerId, CreateOrderRefundRequest request) {
        log.info("Customer {} requesting refund for order {}", customerId, orderId);

        OrderModel order = orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        ensureOrderOwnedByCustomer(order, customerId);

        ensureRefundEligible(order, customerId);

        UserBankAccountModel bankAccount = userBankAccountRepositoryPort
                .findByIdAndUserId(request.bankAccountId(), customerId)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_BANK_ACCOUNT_MISMATCH));

        String reason = request.refundReason().trim();
        BigDecimal refundAmount = calculateRefundAmount(order);

        RefundRequestModel refundRequest = RefundRequestModel.builder()
                .refundType(RefundType.FULL_ORDER)
                .requestedBy(customerId)
                .requestRole(RefundRequestRole.CUSTOMER)
                .refundAmount(refundAmount)
                .refundReason(reason)
                .bankAccountId(bankAccount.getId())
                .build();
        refundRequest.initializeForCreate();

        RefundRequestModel savedRefund = refundRequestRepositoryPort.save(refundRequest);
        int linked = refundRequestRepositoryPort.linkOrderDetailsByOrderId(orderId, savedRefund.getId());
        if (linked <= 0 && order.getOrderDetails() != null && !order.getOrderDetails().isEmpty()) {
            throw new DomainException(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
        }
        savedRefund.setOrderId(orderId);
        savedRefund.setOrderDetailIds(refundRequestRepositoryPort.findOrderDetailIdsByRefundRequestId(savedRefund.getId()));
        publishRefundStatusChanged(savedRefund, order.getOrderCode());
        return refundApplicationMapper.toRefundResponse(savedRefund, bankAccount);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderRefundEligibilityResponse getRefundEligibility(UUID orderId, UUID customerId) {
        OrderModel order = orderRepositoryPort.findById(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        ensureOrderOwnedByCustomer(order, customerId);

        RefundGraceEvaluation grace = orderRefundGraceService.evaluate(order);
        PolicyEvaluation policy = orderRefundPolicyService.evaluate(order, customerId);
        boolean eligible = grace.eligible() && policy.eligible();
        String reason = !grace.eligible()
                ? grace.reason()
                : (!policy.eligible() ? policy.reason() : null);
        List<RefundEligibleTicketItemResponse> refundTickets = buildRefundTicketItems(order);
        BigDecimal totalRefundAmount = calculateRefundAmount(order);

        return new OrderRefundEligibilityResponse(
                eligible,
                reason,
                grace.remainingSeconds(),
                grace.graceMinutes(),
                grace.refundDeadlineAt(),
                grace.paymentSuccessAt(),
                order.getId(),
                order.getOrderCode(),
                order.getStatus() != null ? order.getStatus().name() : null,
                order.getTotalAmount(),
                order.getCreatedAt(),
                refundTickets,
                totalRefundAmount,
                policy.maxRefundRequestsPerDay(),
                policy.refundRequestsSubmittedToday(),
                policy.refundRequestAllowedDays(),
                policy.refundPeriodDeadlineAt(),
                policy.dailyLimitReached(),
                policy.refundPeriodExpired());
    }

    private List<RefundEligibleTicketItemResponse> buildRefundTicketItems(OrderModel order) {
        if (order.getOrderDetails() == null || order.getOrderDetails().isEmpty()) {
            return List.of();
        }

        Map<Long, LotteryTicketResponse> ticketsById = new LinkedHashMap<>();
        Map<Long, LotteryTicketSerialModel> serialsById = new LinkedHashMap<>();

        return order.getOrderDetails().stream()
                .filter(detail -> detail.getStatus() == OrderDetailStatus.ACTIVE)
                .map(detail -> toRefundTicketItem(detail, ticketsById, serialsById))
                .toList();
    }

    private RefundEligibleTicketItemResponse toRefundTicketItem(
            OrderDetailModel detail,
            Map<Long, LotteryTicketResponse> ticketsById,
            Map<Long, LotteryTicketSerialModel> serialsById
    ) {
        LotteryTicketResponse ticket = resolveTicket(detail.getLotteryTicketId(), ticketsById);
        LotteryTicketSerialModel serial = resolveSerial(detail.getLotteryTicketSerialId(), serialsById);
        BigDecimal unitPrice = detail.getPrice() != null ? detail.getPrice() : BigDecimal.ZERO;
        int quantity = detail.getEffectiveQuantity();
        String numbers = ticket != null ? ticket.numbers() : null;
        if ((numbers == null || numbers.isBlank()) && serial != null) {
            numbers = serial.getSerialNumber();
        }

        return RefundEligibleTicketItemResponse.builder()
                .orderDetailId(detail.getId())
                .numbers(numbers)
                .stationName(ticket != null ? ticket.stationName() : null)
                .drawDate(ticket != null ? ticket.drawDate() : null)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .subtotalAmount(unitPrice.multiply(BigDecimal.valueOf(quantity)))
                .build();
    }

    private LotteryTicketResponse resolveTicket(
            Long lotteryTicketId,
            Map<Long, LotteryTicketResponse> ticketsById
    ) {
        if (lotteryTicketId == null) {
            return null;
        }
        return ticketsById.computeIfAbsent(lotteryTicketId, lotteryTicketServicePort::getById);
    }

    private LotteryTicketSerialModel resolveSerial(
            Long lotteryTicketSerialId,
            Map<Long, LotteryTicketSerialModel> serialsById
    ) {
        if (lotteryTicketSerialId == null) {
            return null;
        }
        return serialsById.computeIfAbsent(lotteryTicketSerialId, lotteryTicketSerialServicePort::getByIdOrThrow);
    }

    private void ensureOrderOwnedByCustomer(OrderModel order, UUID customerId) {
        if (order.getUserId() == null || !order.getUserId().equals(customerId)) {
            throw new DomainException(ErrorCode.ACCESS_DENIED);
        }
    }

    private void ensureRefundEligible(OrderModel order, UUID customerId) {
        orderRefundGraceService.ensureEligible(order);
        orderRefundPolicyService.ensureWithinPolicy(order, customerId);
    }

    private BigDecimal calculateRefundAmount(OrderModel order) {
        if (order.getOrderDetails() != null && !order.getOrderDetails().isEmpty()) {
            return order.getOrderDetails().stream()
                    .map(OrderDetailModel::getLineSubtotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        if (order.getTotalAmount() == null || order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_AMOUNT);
        }
        return order.getTotalAmount();
    }

    private void publishRefundStatusChanged(RefundRequestModel refund, String orderCode) {
        eventPublisher.publishEvent(RefundRequestStatusChangedEvent.builder()
                .refundRequestId(refund.getId())
                .customerId(refund.getRequestedBy())
                .orderId(refund.getOrderId())
                .orderCode(orderCode)
                .status(refund.getStatus())
                .rejectReason(refund.getRejectReason())
                .transferNote(refund.getTransferNote())
                .build());
    }
}
