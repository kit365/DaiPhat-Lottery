package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderModel {

    private UUID id;
    private UUID userId;
    private String name;
    private String phone;
    private String orderCode;
    private OrderType orderType;
    private OrderReceiveType receiveType;
    private BigDecimal totalAmount;

    @Builder.Default
    private List<OrderDetailModel> orderDetails = new ArrayList<>();

    @Builder.Default
    private List<TransactionModel> transactions = new ArrayList<>();

    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING_PAYMENT;

    private LocalDateTime expectedPickupAt;
    private LocalDateTime cancelledAt;
    private String cancelReason;
    private LocalDateTime actualPickedUpAt;
    private UUID pickedUpBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        if (this.orderDetails == null) {
            this.orderDetails = new ArrayList<>();
        }
        if (this.transactions == null) {
            this.transactions = new ArrayList<>();
        }
        if (this.status == null) {
            this.status = OrderStatus.PENDING_PAYMENT;
        }
        if (this.receiveType == null) {
            this.receiveType = OrderReceiveType.COUNTER_PICKUP;
        }
    }

    public void markPaid() {
        ensureStatus(OrderStatus.PENDING_PAYMENT);
        this.status = OrderStatus.PAID;
        this.cancelledAt = null;
        this.cancelReason = null;
    }

    public void markPreparing() {
        ensureStatus(OrderStatus.PAID);
        this.status = OrderStatus.PREPARING;
    }

    public void markPendingPickup() {
        ensureStatus(OrderStatus.PREPARING);
        this.status = OrderStatus.PENDING_PICKUP;
    }

    public void completeDirectOrder(UUID operatorId) {
        ensureOrderType(OrderType.DIRECT);
        ensureStatusIn(OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.PENDING_PICKUP);
        this.status = OrderStatus.COMPLETED;
        this.pickedUpBy = operatorId;
        this.actualPickedUpAt = LocalDateTime.now();
    }

    public void completeOnlineOrder(UUID pickedUpBy) {
        ensureOrderType(OrderType.ONLINE);
        ensureStatus(OrderStatus.PENDING_PICKUP);
        this.status = OrderStatus.COMPLETED;
        this.pickedUpBy = pickedUpBy;
        this.actualPickedUpAt = LocalDateTime.now();
    }

    public void cancelBeforePayment(String cancelReason) {
        ensureOrderType(OrderType.ONLINE);
        ensureStatus(OrderStatus.PENDING_PAYMENT);
        cancel(cancelReason);
    }

    public void cancelAfterPayment(String cancelReason) {
        ensureOrderType(OrderType.ONLINE);
        ensureStatusIn(OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.PENDING_PICKUP);
        cancel(cancelReason);
    }

    public void cancelDirectOrder(String cancelReason) {
        ensureOrderType(OrderType.DIRECT);
        ensureStatusIn(OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.PENDING_PICKUP);
        cancel(cancelReason);
    }

    public boolean hasApprovedRefund() {
        return this.orderDetails != null && this.orderDetails.stream().anyMatch(OrderDetailModel::isRefunded);
    }

    private void cancel(String cancelReason) {
        this.status = OrderStatus.CANCELLED;
        this.cancelReason = cancelReason;
        this.cancelledAt = LocalDateTime.now();
    }

    private void ensureOrderType(OrderType expectedType) {
        if (this.orderType != expectedType) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }
    }

    private void ensureStatus(OrderStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }
    }

    private void ensureStatusIn(OrderStatus... allowedStatuses) {
        for (OrderStatus allowedStatus : allowedStatuses) {
            if (this.status == allowedStatus) {
                return;
            }
        }
        throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
    }
}
