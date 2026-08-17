package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
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
    private String email;
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
    private OrderCancelType cancelType;
    private String handoverEvidenceUrl;
    private String paymentComplaintEvidenceUrl;
    private LocalDateTime paymentComplaintSubmittedAt;
    private LocalDateTime paymentComplaintResolvedAt;
    private UUID paymentComplaintResolvedBy;
    private String paymentComplaintResolutionReason;
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
        this.cancelType = null;
    }

    /**
     * A customer may only dispute an automatic online-payment timeout.  The
     * original cancellation metadata is deliberately retained while staff
     * verifies the evidence, so the audit trail is never rewritten.
     */
    public void submitPaymentTimeoutComplaint(String evidenceUrl, LocalDateTime submittedAt) {
        ensureStatus(OrderStatus.CANCELLED);
        if (this.cancelType != OrderCancelType.SYSTEM_PAYMENT_TIMEOUT) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }
        if (evidenceUrl == null || evidenceUrl.isBlank()) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Không thể lưu ảnh chứng từ thanh toán. Vui lòng chọn lại ảnh và thử lại."
            );
        }
        if (submittedAt == null) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Thiếu thời điểm gửi khiếu nại thanh toán."
            );
        }
        this.status = OrderStatus.PAYMENT_COMPLAINT_PENDING;
        this.paymentComplaintEvidenceUrl = evidenceUrl.trim();
        this.paymentComplaintSubmittedAt = submittedAt;
        this.paymentComplaintResolvedAt = null;
        this.paymentComplaintResolvedBy = null;
        this.paymentComplaintResolutionReason = null;
    }

    /** Marks the complaint approved after a completed verification transaction was attached. */
    public void approvePaymentTimeoutComplaint(LocalDateTime resolvedAt) {
        ensureStatus(OrderStatus.PAYMENT_COMPLAINT_PENDING);
        if (resolvedAt == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        this.status = OrderStatus.PAID;
        this.paymentComplaintResolvedAt = resolvedAt;
        this.cancelledAt = null;
        this.cancelReason = null;
        this.cancelType = null;
    }

    /** Rejecting returns to the original timeout cancellation, retaining proof for audit. */
    public void rejectPaymentTimeoutComplaint(String reason, LocalDateTime resolvedAt) {
        ensureStatus(OrderStatus.PAYMENT_COMPLAINT_PENDING);
        if (reason == null || reason.isBlank() || resolvedAt == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        this.status = OrderStatus.CANCELLED;
        this.paymentComplaintResolutionReason = reason.trim();
        this.paymentComplaintResolvedAt = resolvedAt;
    }

    public void markPreparing() {
        ensureStatus(OrderStatus.PAID);
        this.status = OrderStatus.PREPARING;
    }

    public void markPendingPickup() {
        ensureStatus(OrderStatus.PREPARING);
        this.status = OrderStatus.PENDING_PICKUP;
        if (this.orderDetails != null) {
            this.orderDetails.stream()
                    .filter(detail -> detail.getStatus() == com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus.PROXY_HOLDING)
                    .forEach(OrderDetailModel::openHandover);
        }
    }

    public void completeDirectOrder(UUID operatorId) {
        ensureOrderType(OrderType.DIRECT);
        ensurePaidFulfillmentStatus();
        this.status = OrderStatus.COMPLETED;
        this.pickedUpBy = operatorId;
        this.actualPickedUpAt = LocalDateTime.now();
    }

    public void completeOnlineOrder(UUID pickedUpBy) {
        ensureOrderType(OrderType.ONLINE);
        ensureStatus(OrderStatus.PENDING_PICKUP);
        if (this.orderDetails == null || this.orderDetails.stream().anyMatch(detail -> !detail.isFinalHandoverState())) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS, "Cần hoàn tất bàn giao hoặc ghi nhận từ chối cho từng vé.");
        }
        this.status = OrderStatus.COMPLETED;
        this.pickedUpBy = pickedUpBy;
        this.actualPickedUpAt = LocalDateTime.now();
    }

    public void cancelPendingPayment(String cancelReason) {
        cancelPendingPayment(cancelReason, null);
    }

    public void cancelPendingPayment(String cancelReason, OrderCancelType cancelType) {
        ensureStatus(OrderStatus.PENDING_PAYMENT);
        cancel(cancelReason, false, cancelType);
    }

    public void cancelAfterPayment(String cancelReason) {
        cancelAfterPayment(cancelReason, null);
    }

    public void cancelAfterPayment(String cancelReason, OrderCancelType cancelType) {
        ensureOrderType(OrderType.ONLINE);
        ensurePaidFulfillmentStatus();
        cancel(cancelReason, false, cancelType);
    }

    /** Cancels a paid/preparing online order for a refund request; details become REFUND_PENDING. */
    public void cancelAfterPaymentForRefund(String cancelReason) {
        cancelAfterPaymentForRefund(cancelReason, null);
    }

    public void cancelAfterPaymentForRefund(String cancelReason, OrderCancelType cancelType) {
        cancelPaidFulfillmentForRefund(cancelReason, cancelType);
    }

    /**
     * Customer/staff refund cancel for PAID / PREPARING / PENDING_PICKUP.
     * Does not require ONLINE vs DIRECT — PayOS online orders are PREPARING after pay.
     */
    public void cancelPaidFulfillmentForRefund(String cancelReason, OrderCancelType cancelType) {
        ensurePaidFulfillmentStatus();
        cancel(cancelReason, true, cancelType);
    }

    public void cancelByCustomerRefund(String cancelReason) {
        cancelByCustomerRefund(cancelReason, OrderCancelType.CUSTOMER_REQUEST);
    }

    public void cancelByCustomerRefund(String cancelReason, OrderCancelType cancelType) {
        if (this.status != OrderStatus.PAID) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }
        cancel(cancelReason, true, cancelType);
    }

    public void cancelDirectOrder(String cancelReason) {
        cancelDirectOrder(cancelReason, null);
    }

    public void cancelDirectOrder(String cancelReason, OrderCancelType cancelType) {
        ensureOrderType(OrderType.DIRECT);
        ensurePaidFulfillmentStatus();
        cancel(cancelReason, false, cancelType);
    }

    /** Cancels a direct order for a refund request; details become REFUND_PENDING. */
    public void cancelDirectOrderForRefund(String cancelReason) {
        cancelDirectOrderForRefund(cancelReason, null);
    }

    public void cancelDirectOrderForRefund(String cancelReason, OrderCancelType cancelType) {
        ensureOrderType(OrderType.DIRECT);
        ensurePaidFulfillmentStatus();
        cancel(cancelReason, true, cancelType);
    }

    public boolean hasApprovedRefund() {
        return this.orderDetails != null && this.orderDetails.stream().anyMatch(OrderDetailModel::isRefunded);
    }

    public BigDecimal getCompletedTransactionAmount() {
        if (this.transactions == null) {
            return BigDecimal.ZERO;
        }
        return this.transactions.stream()
                .filter(transaction -> transaction.getStatus() == TransactionStatus.COMPLETED)
                .map(TransactionModel::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public void recalculateTotalAmount() {
        if (this.orderDetails != null) {
            this.totalAmount = this.orderDetails.stream()
                    .filter(OrderDetailModel::contributesToOrderAmount)
                    .map(OrderDetailModel::getLineSubtotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }

    public boolean isFullyPaid() {
        if (this.totalAmount == null) {
            return false;
        }
        return getCompletedTransactionAmount().compareTo(this.totalAmount) == 0;
    }

    private void cancel(String cancelReason, boolean forRefund, OrderCancelType cancelType) {
        this.status = OrderStatus.CANCELLED;
        this.cancelReason = cancelReason;
        this.cancelType = cancelType;
        this.cancelledAt = LocalDateTime.now();
        if (this.orderDetails != null) {
            if (forRefund) {
                // Skip details already REFUND_PENDING / REFUNDED from a prior partial refund.
                this.orderDetails.stream()
                        .filter(OrderDetailModel::canEnterRefundLifecycle)
                        .forEach(OrderDetailModel::markRefundPending);
            } else {
                this.orderDetails.stream()
                        .filter(OrderDetailModel::isAwaitingHandover)
                        .forEach(OrderDetailModel::markCancelled);
            }
        }
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

    private void ensurePaidFulfillmentStatus() {
        if (this.status != OrderStatus.PAID
                && this.status != OrderStatus.PREPARING
                && this.status != OrderStatus.PENDING_PICKUP) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }
    }

}
