package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.ReportSerialFaultRequest;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderDetailQueryRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.orders.OrderCancelReasonDefaults;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LotteryTicketSerialIncidentService {

    private static final EnumSet<OrderStatus> REFUNDABLE_ORDER_STATUSES = EnumSet.of(
            OrderStatus.PAID,
            OrderStatus.PREPARING,
            OrderStatus.PENDING_PICKUP);

    private final OrderRepositoryPort orderRepositoryPort;
    private final OrderDetailQueryRepositoryPort orderDetailQueryRepositoryPort;
    private final OrderDetailSerialRepositoryPort orderDetailSerialRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotteryTicketAggregateSyncService lotteryTicketAggregateSyncService;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void handleAfterFaultReported(
            LotteryTicketSerialModel faultedSerial,
            LotteryTicketSerialStatus priorStatus,
            LocalDateTime priorReservationExpiresAt,
            UUID priorOrderId,
            ReportSerialFaultRequest request,
            UUID actorId
    ) {
        if (priorStatus == LotteryTicketSerialStatus.IN_STOCK) {
            handleInternalInventoryAfterFault(faultedSerial, request, actorId);
        } else if (priorStatus == LotteryTicketSerialStatus.RESERVED
                || priorStatus == LotteryTicketSerialStatus.PROXY_HOLDING) {
            handleActiveTransactionAfterFault(
                    faultedSerial,
                    priorStatus,
                    priorReservationExpiresAt,
                    priorOrderId,
                    request,
                    actorId);
        }

        lotteryTicketAggregateSyncService.syncTicketAggregate(faultedSerial.getTicketId());
    }

    private void handleInternalInventoryAfterFault(
            LotteryTicketSerialModel faultedSerial,
            ReportSerialFaultRequest request,
            UUID actorId
    ) {
        if (request.ticketCondition() != TicketCondition.VOIDED
                || request.faultedBy() != LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT) {
            return;
        }
        createReplacementSerialIfRequested(
                faultedSerial,
                LotteryTicketSerialStatus.IN_STOCK,
                null,
                null,
                request,
                actorId,
                null);
    }

    private void handleActiveTransactionAfterFault(
            LotteryTicketSerialModel faultedSerial,
            LotteryTicketSerialStatus priorStatus,
            LocalDateTime priorReservationExpiresAt,
            UUID priorOrderId,
            ReportSerialFaultRequest request,
            UUID actorId
    ) {
        if (request.faultedBy() == LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT
                && request.ticketCondition() == TicketCondition.VOIDED) {
            OrderDetailModel detail = resolveActiveOrderDetail(faultedSerial);
            createReplacementSerialIfRequested(
                    faultedSerial,
                    priorStatus,
                    priorReservationExpiresAt,
                    priorOrderId,
                    request,
                    actorId,
                    detail);
            return;
        }

        if (request.ticketCondition() == TicketCondition.DAMAGED
                || request.ticketCondition() == TicketCondition.LOST) {
            // Only cancel the order when this was the last active allocated serial.
            // Otherwise keep the order (and its cancel reason) untouched.
            if (isLastActiveAllocatedSerialOnOrder(faultedSerial, priorOrderId)) {
                cancelOrderWithFullRefund(faultedSerial, priorOrderId, request, actorId);
            }
        }
    }

    /**
     * After the faulted serial is already marked DAMAGED/LOST, returns true when the order
     * has no remaining allocated serials still holding stock for delivery
     * (RESERVED / PROXY_HOLDING / SOLD).
     */
    private boolean isLastActiveAllocatedSerialOnOrder(
            LotteryTicketSerialModel faultedSerial,
            UUID priorOrderId
    ) {
        UUID orderId = priorOrderId;
        if (orderId == null) {
            orderId = orderDetailQueryRepositoryPort.findActiveContextBySerialId(faultedSerial.getId())
                    .map(OrderDetailQueryRepositoryPort.ActiveSerialOrderContext::orderId)
                    .orElse(null);
        }
        if (orderId == null) {
            // Avoid accidental full-order cancel when we cannot resolve the linked order.
            return false;
        }

        OrderModel order = orderRepositoryPort.findByIdWithLock(orderId).orElse(null);
        if (order == null || order.getOrderDetails() == null) {
            return false;
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            return false;
        }

        for (OrderDetailModel detail : order.getOrderDetails()) {
            if (detail.getStatus() != OrderDetailStatus.ACTIVE) {
                continue;
            }
            for (Long serialId : resolveAllocatedSerialIds(detail)) {
                if (Objects.equals(serialId, faultedSerial.getId())) {
                    continue;
                }
                LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findById(serialId).orElse(null);
                if (serial == null) {
                    continue;
                }
                LotteryTicketSerialStatus status = serial.getStatus();
                if (status == LotteryTicketSerialStatus.RESERVED
                        || status == LotteryTicketSerialStatus.PROXY_HOLDING
                        || status == LotteryTicketSerialStatus.SOLD) {
                    return false;
                }
            }
        }
        return true;
    }

    private void createReplacementSerialIfRequested(
            LotteryTicketSerialModel faultedSerial,
            LotteryTicketSerialStatus priorStatus,
            LocalDateTime priorReservationExpiresAt,
            UUID priorOrderId,
            ReportSerialFaultRequest request,
            UUID actorId,
            OrderDetailModel orderDetail
    ) {
        if (request.replacementSerialNumber() == null || request.replacementSerialNumber().isBlank()) {
            return;
        }

        LotteryTicketSerialModel replacement = LotteryTicketSerialModel.builder()
                .ticketId(faultedSerial.getTicketId())
                .importBatchId(faultedSerial.getImportBatchId())
                .importBatchLineId(faultedSerial.getImportBatchLineId())
                .ticketImg(request.replacementTicketImg())
                .serialNumber(request.replacementSerialNumber().trim())
                .stationId(faultedSerial.getStationId())
                .drawDate(faultedSerial.getDrawDate())
                .inputSource(InputSource.MANUAL)
                .replacedForTicketId(faultedSerial.getId())
                .build();
        replacement.initializeImport(actorId);

        if (orderDetail != null) {
            UUID orderId = priorOrderId != null ? priorOrderId : orderDetail.getOrderId();
            if (priorStatus == LotteryTicketSerialStatus.RESERVED && orderId != null) {
                replacement.assumeReservedForOrder(orderId, priorReservationExpiresAt);
            } else if (priorStatus == LotteryTicketSerialStatus.PROXY_HOLDING && orderId != null) {
                replacement.assumeProxyHolding(orderId);
            }
        }

        LotteryTicketSerialModel savedReplacement = lotteryTicketSerialRepositoryPort.save(replacement);

        if (orderDetail == null) {
            return;
        }

        Long oldSerialId = faultedSerial.getId();
        LotteryTicketModel ticket = lotteryTicketRepositoryPort.findById(faultedSerial.getTicketId())
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        OrderModel order = orderRepositoryPort.findByIdWithLock(orderDetail.getOrderId())
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));
        OrderDetailModel detail = findDetail(order, orderDetail.getId());

        detail.applySerialReplacement(savedReplacement.getTicketId(), savedReplacement.getId(), ticket.getPriceSnapshot());
        orderDetailSerialRepositoryPort.replaceSerialAllocation(detail.getId(), oldSerialId, savedReplacement.getId());
        orderRepositoryPort.save(order);
    }

    private void cancelOrderWithFullRefund(
            LotteryTicketSerialModel faultedSerial,
            UUID priorOrderId,
            ReportSerialFaultRequest request,
            UUID actorId
    ) {
        OrderDetailQueryRepositoryPort.ActiveSerialOrderContext context =
                orderDetailQueryRepositoryPort.findActiveContextBySerialId(faultedSerial.getId())
                        .orElseGet(() -> {
                            UUID orderId = priorOrderId != null
                                    ? priorOrderId
                                    : faultedSerial.getReservedByOrderId();
                            if (orderId == null) {
                                throw new DomainException(
                                        ErrorCode.ORDER_NOT_FOUND,
                                        "Không tìm thấy đơn hàng liên kết với sê-ri sự cố.");
                            }
                            return new OrderDetailQueryRepositoryPort.ActiveSerialOrderContext(orderId, null);
                        });

        OrderModel order = orderRepositoryPort.findByIdWithLock(context.orderId())
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (!REFUNDABLE_ORDER_STATUSES.contains(order.getStatus())) {
            throw new DomainException(
                    ErrorCode.ORDER_INVALID_STATUS,
                    "Không thể xử lý sự cố kho khi đơn ở trạng thái " + order.getStatus().getLabel() + ".");
        }
        if (order.getUserId() == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Đơn hàng không có khách hàng liên kết.");
        }

        releaseNonFaultedSerials(order, faultedSerial.getId());

        String cancelReason = OrderCancelReasonDefaults.resolve(
                OrderCancelType.OUT_OF_STOCK_INCIDENT,
                request.damagedReason());
        cancelOrderForInventoryIncident(order, cancelReason);
        orderRepositoryPort.save(order);

        BigDecimal refundAmount = calculateUnlinkedRefundAmount(order);
        if (refundAmount.compareTo(BigDecimal.ZERO) <= 0
                && !hasUnlinkedOrderDetails(order)) {
            // Prior partial refunds already covered every detail — just cancel the order shell.
            publishOrderCancelled(order);
            return;
        }

        RefundRequestModel refundRequest = RefundRequestModel.builder()
                .refundType(hasAnyLinkedOrderDetail(order) ? RefundType.ORDER_DETAIL : RefundType.FULL_ORDER)
                .requestedBy(order.getUserId())
                .requestRole(RefundRequestRole.STAFF)
                .refundAmount(refundAmount)
                .refundReason(cancelReason)
                .createdBy(actorId != null ? actorId.toString() : null)
                .build();
        refundRequest.initializeForStaffIncidentCancel();

        RefundRequestModel savedRefund = refundRequestRepositoryPort.save(refundRequest);
        int linked = refundRequestRepositoryPort.linkOrderDetailsByOrderId(order.getId(), savedRefund.getId());
        if (linked <= 0) {
            throw new DomainException(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
        }
        savedRefund.setOrderId(order.getId());
        savedRefund.setOrderDetailIds(
                refundRequestRepositoryPort.findOrderDetailIdsByRefundRequestId(savedRefund.getId()));

        publishRefundStatusChanged(savedRefund, order.getOrderCode());
        publishOrderCancelled(order);
    }

    private void releaseNonFaultedSerials(OrderModel order, Long faultedSerialId) {
        if (order.getOrderDetails() == null) {
            return;
        }
        Set<Long> ticketIdsToSync = new HashSet<>();
        for (OrderDetailModel detail : order.getOrderDetails()) {
            if (detail.getStatus() != OrderDetailStatus.ACTIVE) {
                continue;
            }
            for (Long serialId : resolveAllocatedSerialIds(detail)) {
                if (Objects.equals(serialId, faultedSerialId)) {
                    continue;
                }
                LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findById(serialId)
                        .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
                if (serial.getStatus() != LotteryTicketSerialStatus.RESERVED) {
                    continue;
                }
                LotteryTicketModel ticket = lotteryTicketRepositoryPort.findById(serial.getTicketId())
                        .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
                LotteryStationModel station = lotteryStationServicePort.findModelById(ticket.getStationId())
                        .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));
                boolean expireAfterRelease = ticket.isExpired(station.getDrawTime());
                serial.releaseReservation();
                if (expireAfterRelease) {
                    serial.expire();
                }
                lotteryTicketSerialRepositoryPort.save(serial);
                ticketIdsToSync.add(serial.getTicketId());
            }
        }
        ticketIdsToSync.forEach(lotteryTicketAggregateSyncService::syncTicketAggregate);
    }

    private void cancelOrderForInventoryIncident(OrderModel order, String cancelReason) {
        if (order.getOrderType() == OrderType.DIRECT) {
            order.cancelDirectOrderForRefund(cancelReason, OrderCancelType.OUT_OF_STOCK_INCIDENT);
            return;
        }
        if (order.getStatus() == OrderStatus.PAID) {
            order.cancelByCustomerRefund(cancelReason, OrderCancelType.OUT_OF_STOCK_INCIDENT);
            return;
        }
        order.cancelAfterPaymentForRefund(cancelReason, OrderCancelType.OUT_OF_STOCK_INCIDENT);
    }

    private OrderDetailModel resolveActiveOrderDetail(LotteryTicketSerialModel faultedSerial) {
        OrderDetailQueryRepositoryPort.ActiveSerialOrderContext context =
                orderDetailQueryRepositoryPort.findActiveContextBySerialId(faultedSerial.getId())
                        .orElseThrow(() -> new DomainException(
                                ErrorCode.ORDER_NOT_FOUND,
                                "Không tìm thấy chi tiết đơn hàng cho sê-ri đang giao dịch."));
        OrderModel order = orderRepositoryPort.findByIdWithLock(context.orderId())
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));
        return findDetail(order, context.orderDetailId());
    }

    private OrderDetailModel findDetail(OrderModel order, Long detailId) {
        if (order.getOrderDetails() == null) {
            throw new DomainException(ErrorCode.ORDER_DETAIL_NOT_FOUND);
        }
        return order.getOrderDetails().stream()
                .filter(d -> Objects.equals(d.getId(), detailId))
                .findFirst()
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_DETAIL_NOT_FOUND));
    }

    private List<Long> resolveAllocatedSerialIds(OrderDetailModel detail) {
        if (detail.getAllocatedSerialIds() != null && !detail.getAllocatedSerialIds().isEmpty()) {
            return detail.getAllocatedSerialIds();
        }
        if (detail.getId() != null) {
            List<Long> persisted = orderDetailSerialRepositoryPort.findSerialIdsByOrderDetailId(detail.getId());
            if (!persisted.isEmpty()) {
                return persisted;
            }
        }
        if (detail.getReplacedByTicketSerialId() != null) {
            return List.of(detail.getReplacedByTicketSerialId());
        }
        if (detail.getLotteryTicketSerialId() != null) {
            return List.of(detail.getLotteryTicketSerialId());
        }
        return List.of();
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

    private BigDecimal calculateUnlinkedRefundAmount(OrderModel order) {
        if (order.getOrderDetails() == null || order.getOrderDetails().isEmpty()) {
            return calculateRefundAmount(order);
        }
        return order.getOrderDetails().stream()
                .filter(detail -> detail.getRefundRequestId() == null)
                .map(OrderDetailModel::getLineSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean hasUnlinkedOrderDetails(OrderModel order) {
        return order.getOrderDetails() != null
                && order.getOrderDetails().stream().anyMatch(detail -> detail.getRefundRequestId() == null);
    }

    private boolean hasAnyLinkedOrderDetail(OrderModel order) {
        return order.getOrderDetails() != null
                && order.getOrderDetails().stream().anyMatch(detail -> detail.getRefundRequestId() != null);
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
