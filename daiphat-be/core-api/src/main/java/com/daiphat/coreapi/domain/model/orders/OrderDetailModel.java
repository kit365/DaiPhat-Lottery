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
    private OrderDetailStatus status = OrderDetailStatus.ACTIVE;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        if (this.status == null) {
            this.status = OrderDetailStatus.ACTIVE;
        }
    }

    public void markRefundPending() {
        ensureStatus(OrderDetailStatus.ACTIVE);
        this.status = OrderDetailStatus.REFUND_PENDING;
    }

    public void markInactive() {
        if (this.status == OrderDetailStatus.ACTIVE) {
            this.status = OrderDetailStatus.INACTIVE;
        }
    }

    public void markRefunded() {
        ensureStatus(OrderDetailStatus.REFUND_PENDING);
        this.status = OrderDetailStatus.REFUNDED;
    }

    public void restoreActive() {
        ensureStatus(OrderDetailStatus.REFUND_PENDING);
        this.status = OrderDetailStatus.ACTIVE;
    }

    public void replaceWith(Long replacementTicketId, Long replacementTicketSerialId) {
        this.replacedByTicketId = replacementTicketId;
        this.replacedByTicketSerialId = replacementTicketSerialId;
    }

    /** Swap the allocated serial to a replacement and record replacedBy*. */
    public void applySerialReplacement(Long replacementTicketId, Long replacementTicketSerialId) {
        if (replacementTicketSerialId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        this.lotteryTicketId = replacementTicketId;
        this.lotteryTicketSerialId = replacementTicketSerialId;
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
