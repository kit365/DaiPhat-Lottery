package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Shared atomic steps for manual and system order cancellation with refund. */
@Service
@RequiredArgsConstructor
public class OrderCancellationRefundService {

    private final OrderRepositoryPort orderRepositoryPort;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final OrderDetailSerialRepositoryPort orderDetailSerialRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final ApplicationEventPublisher eventPublisher;

    public RefundRequestModel cancelLockedOrder(
            OrderModel order,
            String cancelReason,
            OrderCancelType cancelType,
            RefundRequestRole requestRole,
            String createdBy,
            boolean releaseTickets
    ) {
        if (order == null || order.getUserId() == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Đơn hàng không có khách hàng liên kết.");
        }

        List<OrderDetailModel> allDetails = order.getOrderDetails() == null
                ? List.of()
                : order.getOrderDetails();
        if (allDetails.isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Đơn hàng không có vé để hoàn tiền.");
        }
        List<OrderDetailModel> unlinkedDetails = allDetails.stream()
                        .filter(detail -> detail.getRefundRequestId() == null)
                        .toList();
        if (unlinkedDetails.isEmpty()) {
            if (requestRole == RefundRequestRole.SYSTEM) {
                cancelOrder(order, cancelReason, cancelType);
                orderRepositoryPort.save(order);
                publishOrderEvent(order);
                return null;
            }
            throw new DomainException(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
        }

        BigDecimal refundAmount = unlinkedDetails.stream()
                .map(OrderDetailModel::getLineSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (refundAmount.signum() <= 0) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_AMOUNT);
        }

        boolean hasPriorRefund = order.getOrderDetails().stream()
                .anyMatch(detail -> detail.getRefundRequestId() != null);
        cancelOrder(order, cancelReason, cancelType);
        if (releaseTickets) {
            releaseOrderTickets(unlinkedDetails);
        }
        orderRepositoryPort.save(order);

        RefundRequestModel refund = RefundRequestModel.builder()
                .refundType(hasPriorRefund ? RefundType.ORDER_DETAIL : RefundType.FULL_ORDER)
                .requestedBy(order.getUserId())
                .requestRole(requestRole)
                .refundAmount(refundAmount)
                .refundReason(cancelReason)
                .createdBy(createdBy)
                .build();
        refund.initializeForIncidentCancel(requestRole);
        refund = refundRequestRepositoryPort.save(refund);

        int linked = refundRequestRepositoryPort.linkOrderDetailsByOrderId(order.getId(), refund.getId());
        if (linked <= 0) {
            throw new DomainException(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
        }
        refund.setOrderId(order.getId());
        refund.setOrderDetailIds(refundRequestRepositoryPort.findOrderDetailIdsByRefundRequestId(refund.getId()));

        publishEvents(order, refund);
        return refund;
    }

    private void cancelOrder(OrderModel order, String reason, OrderCancelType cancelType) {
        if (order.getOrderType() == OrderType.DIRECT) {
            order.cancelDirectOrderForRefund(reason, cancelType);
        } else if (order.getStatus() == OrderStatus.PAID) {
            order.cancelByCustomerRefund(reason, cancelType);
        } else {
            order.cancelAfterPaymentForRefund(reason, cancelType);
        }
    }

    private void releaseOrderTickets(List<OrderDetailModel> details) {
        Set<Long> serialIds = new LinkedHashSet<>();
        for (OrderDetailModel detail : details) {
            if (detail.getReplacedByTicketSerialId() != null) {
                serialIds.add(detail.getReplacedByTicketSerialId());
                continue;
            }
            if (detail.getAllocatedSerialIds() != null) {
                serialIds.addAll(detail.getAllocatedSerialIds());
            }
            if (detail.getId() != null) {
                serialIds.addAll(orderDetailSerialRepositoryPort.findSerialIdsByOrderDetailId(detail.getId()));
            }
            if (detail.getLotteryTicketSerialId() != null) {
                serialIds.add(detail.getLotteryTicketSerialId());
            }
        }
        serialIds.forEach(lotteryTicketServicePort::returnSoldTicketForOrder);
    }

    private void publishEvents(OrderModel order, RefundRequestModel refund) {
        eventPublisher.publishEvent(RefundRequestStatusChangedEvent.builder()
                .refundRequestId(refund.getId())
                .customerId(refund.getRequestedBy())
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .status(refund.getStatus())
                .retryCount(refund.getRetryCount())
                .refundType(refund.getRefundType())
                .requestRole(refund.getRequestRole())
                .build());
        publishOrderEvent(order);
    }

    private void publishOrderEvent(OrderModel order) {
        eventPublisher.publishEvent(OrderStatusChangedEvent.builder()
                .orderId(order.getId())
                .customerId(order.getUserId())
                .orderCode(order.getOrderCode())
                .status(order.getStatus())
                .build());
    }
}
