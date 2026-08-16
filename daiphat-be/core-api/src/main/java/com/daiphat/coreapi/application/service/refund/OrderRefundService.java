package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.request.refund.CreateOrderRefundRequest;
import com.daiphat.coreapi.application.dto.response.refund.OrderRefundEligibilityResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundEligibleTicketItemResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.refund.OrderRefundServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.service.refund.OrderRefundGraceService.RefundGraceEvaluation;
import com.daiphat.coreapi.application.service.refund.OrderRefundPolicyService.PolicyEvaluation;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderRefundService implements OrderRefundServicePort {

    private final OrderRepositoryPort orderRepositoryPort;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final OrderDetailSerialRepositoryPort orderDetailSerialRepositoryPort;
    private final RefundApplicationMapper refundApplicationMapper;
    private final RefundTicketItemResolver refundTicketItemResolver;
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

        cancelOrderForCustomerRefund(order, reason);
        releaseSoldTickets(order);
        // Save order first: cascading order_details would overwrite refund_request_id if linked earlier.
        orderRepositoryPort.save(order);

        int linked = refundRequestRepositoryPort.linkOrderDetailsByOrderId(orderId, savedRefund.getId());
        if (linked <= 0 && order.getOrderDetails() != null && !order.getOrderDetails().isEmpty()) {
            throw new DomainException(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
        }

        savedRefund.setOrderId(orderId);
        savedRefund.setOrderDetailIds(refundRequestRepositoryPort.findOrderDetailIdsByRefundRequestId(savedRefund.getId()));
        publishRefundStatusChanged(savedRefund, order.getOrderCode());
        publishOrderCancelled(order);
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
        List<RefundEligibleTicketItemResponse> refundTickets = refundTicketItemResolver.resolveFromOrder(order);
        BigDecimal totalRefundAmount = calculateRefundAmount(order);

        return new OrderRefundEligibilityResponse(
                eligible,
                reason,
                grace.remainingSeconds(),
                grace.graceMinutes(),
                DrawScheduleUtils.toVietnamOffset(grace.refundDeadlineAt()),
                DrawScheduleUtils.toVietnamOffset(grace.paymentSuccessAt()),
                order.getId(),
                order.getOrderCode(),
                order.getStatus() != null ? order.getStatus().name() : null,
                order.getTotalAmount(),
                order.getCreatedAt(),
                refundTickets,
                totalRefundAmount,
                policy.maxRefundRequestsPerDay(),
                policy.refundRequestsSubmittedToday(),
                policy.dailyLimitReached());
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

    private void cancelOrderForCustomerRefund(OrderModel order, String cancelReason) {
        order.cancelPaidFulfillmentForRefund(cancelReason, OrderCancelType.CUSTOMER_REQUEST);
    }

    private void releaseSoldTickets(OrderModel order) {
        if (order.getOrderDetails() == null) {
            return;
        }
        for (OrderDetailModel detail : order.getOrderDetails()) {
            for (Long serialId : resolveAllocatedSerialIds(detail)) {
                lotteryTicketServicePort.returnSoldTicketForOrder(serialId);
            }
        }
    }

    private List<Long> resolveAllocatedSerialIds(OrderDetailModel detail) {
        if (detail.getAllocatedSerialIds() != null && !detail.getAllocatedSerialIds().isEmpty()) {
            return detail.getAllocatedSerialIds();
        }
        if (detail.getId() != null) {
            List<Long> persistedSerialIds = orderDetailSerialRepositoryPort.findSerialIdsByOrderDetailId(detail.getId());
            if (!persistedSerialIds.isEmpty()) {
                return persistedSerialIds;
            }
        }
        if (detail.getLotteryTicketSerialId() != null) {
            return List.of(detail.getLotteryTicketSerialId());
        }
        return List.of();
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

    private void publishRefundStatusChanged(RefundRequestModel refund, String orderCode) {
        eventPublisher.publishEvent(RefundRequestStatusChangedEvent.builder()
                .refundRequestId(refund.getId())
                .customerId(refund.getRequestedBy())
                .orderId(refund.getOrderId())
                .orderCode(orderCode)
                .status(refund.getStatus())
                .retryCount(refund.getRetryCount())
                .refundType(refund.getRefundType())
                .requestRole(refund.getRequestRole())
                .build());
    }
}
