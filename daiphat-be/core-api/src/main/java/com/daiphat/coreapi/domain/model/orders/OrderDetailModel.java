package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
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
public class OrderDetailModel {

    private Long id;
    private UUID orderId;
    private Long lotteryTicketId;
    private Long lotteryTicketSerialId;
    private Long replacedByTicketId;
    private Long replacedByTicketSerialId;
    private Long refundRequestId;

    @Builder.Default
    private Integer quantity = 1;

    @Builder.Default
    private List<Long> allocatedSerialIds = new ArrayList<>();

    private BigDecimal price;

    @Builder.Default
    private boolean hasReplacement = false;

    @Builder.Default
    private OrderDetailStatus status = OrderDetailStatus.HANDOVER_IN_PROGRESS;

    /** Why a paid ticket was not accepted by the customer. Never implies a refund. */
    private String rejectionReason;
    private LocalDateTime rejectedAt;
    private UUID rejectedBy;
    private LocalDateTime handedOverAt;
    private UUID handedOverBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        if (this.status == null) {
            this.status = OrderDetailStatus.HANDOVER_IN_PROGRESS;
        }
    }

    public void markRefundPending() {
        if (!canEnterRefundLifecycle()) {
            throw new DomainException(ErrorCode.ORDER_DETAIL_INVALID_STATUS);
        }
        this.status = OrderDetailStatus.REFUND_PENDING;
    }

    public void markProxyHolding() {
        if (this.status == OrderDetailStatus.HANDOVER_IN_PROGRESS
                || this.status == OrderDetailStatus.CANCELLED) {
            this.status = OrderDetailStatus.PROXY_HOLDING;
        }
    }

    /** Close an unfulfilled line when its parent order is cancelled without a refund. */
    public void markCancelled() {
        if (!isAwaitingHandover()) {
            throw new DomainException(ErrorCode.ORDER_DETAIL_INVALID_STATUS);
        }
        this.status = OrderDetailStatus.CANCELLED;
    }

    public void openHandover() {
        ensureStatus(OrderDetailStatus.PROXY_HOLDING);
        this.status = OrderDetailStatus.HANDOVER_IN_PROGRESS;
    }

    public void markHandedOver(UUID operatorId, LocalDateTime handedOverAt) {
        ensureStatus(OrderDetailStatus.HANDOVER_IN_PROGRESS);
        if (operatorId == null || handedOverAt == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        this.status = OrderDetailStatus.HANDED_OVER;
        this.handedOverBy = operatorId;
        this.handedOverAt = handedOverAt;
    }

    public void markRefunded() {
        ensureStatus(OrderDetailStatus.REFUND_PENDING);
        this.status = OrderDetailStatus.REFUNDED;
    }

    public void markRejectedByCustomer(String reason, UUID operatorId, LocalDateTime rejectedAt) {
        ensureStatus(OrderDetailStatus.HANDOVER_IN_PROGRESS);
        if (reason == null || reason.isBlank() || operatorId == null || rejectedAt == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cần nêu lý do khách từ chối nhận vé.");
        }
        this.status = OrderDetailStatus.REJECTED_BY_CUSTOMER;
        this.rejectionReason = reason.trim();
        this.rejectedBy = operatorId;
        this.rejectedAt = rejectedAt;
    }

    public void restoreToHandoverInProgress() {
        ensureStatus(OrderDetailStatus.REFUND_PENDING);
        this.status = OrderDetailStatus.HANDOVER_IN_PROGRESS;
    }

    public void replaceWith(Long replacementTicketId, Long replacementTicketSerialId) {
        this.replacedByTicketId = replacementTicketId;
        this.replacedByTicketSerialId = replacementTicketSerialId;
    }

    /** Swap the allocated serial to a replacement and record replacedBy*, while keeping the old ticket info and updating price. */
    public void applySerialReplacement(Long replacementTicketId, Long replacementTicketSerialId, BigDecimal newPrice) {
        if (replacementTicketSerialId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        if (newPrice != null) {
            this.price = newPrice;
        }
        replaceWith(replacementTicketId, replacementTicketSerialId);
        if (this.allocatedSerialIds != null) {
            this.allocatedSerialIds = new ArrayList<>(List.of(replacementTicketSerialId));
        }
    }

    public boolean isReplaced() {
        return this.replacedByTicketSerialId != null;
    }

    public boolean isRefunded() {
        return this.status == OrderDetailStatus.REFUNDED;
    }

    public boolean isAwaitingHandover() {
        return this.status == OrderDetailStatus.PROXY_HOLDING
                || this.status == OrderDetailStatus.HANDOVER_IN_PROGRESS;
    }

    public boolean isFinalHandoverState() {
        return this.status == OrderDetailStatus.HANDED_OVER
                || this.status == OrderDetailStatus.REJECTED_BY_CUSTOMER
                || this.status == OrderDetailStatus.REFUNDED;
    }

    public boolean canEnterRefundLifecycle() {
        return isAwaitingHandover() || this.status == OrderDetailStatus.REJECTED_BY_CUSTOMER;
    }

    public boolean contributesToOrderAmount() {
        // A cancelled payment-timeout order may later be reinstated after its
        // payment proof is verified. Keep its line value in the order total so
        // the verified payment is calculated from the original payable amount.
        return this.status != OrderDetailStatus.REFUNDED;
    }

    public int getEffectiveQuantity() {
        return quantity != null && quantity > 0 ? quantity : 1;
    }

    public BigDecimal getLineSubtotal() {
        BigDecimal unitPrice = price != null ? price : BigDecimal.ZERO;
        return unitPrice.multiply(BigDecimal.valueOf(getEffectiveQuantity()));
    }

    private void ensureStatus(OrderDetailStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.ORDER_DETAIL_INVALID_STATUS);
        }
    }
}
