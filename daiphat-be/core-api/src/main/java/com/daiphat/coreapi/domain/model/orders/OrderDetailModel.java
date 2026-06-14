package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderDetailStatus;
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
    private Long replacedByTicketId;
    private BigDecimal price;

    @Builder.Default
    private OrderDetailStatus status = OrderDetailStatus.ACTIVE;

    @Builder.Default
    private List<OrderRefundModel> refunds = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        if (this.status == null) {
            this.status = OrderDetailStatus.ACTIVE;
        }
        if (this.refunds == null) {
            this.refunds = new ArrayList<>();
        }
    }

    public void markRefundPending() {
        ensureStatus(OrderDetailStatus.ACTIVE);
        this.status = OrderDetailStatus.REFUND_PENDING;
    }

    public void markRefunded() {
        ensureStatus(OrderDetailStatus.REFUND_PENDING);
        this.status = OrderDetailStatus.REFUNDED;
    }

    public void restoreActive() {
        ensureStatus(OrderDetailStatus.REFUND_PENDING);
        this.status = OrderDetailStatus.ACTIVE;
    }

    public void replaceWith(Long replacementTicketId) {
        this.replacedByTicketId = replacementTicketId;
    }

    public boolean isReplaced() {
        return this.replacedByTicketId != null;
    }

    public boolean isRefunded() {
        return this.status == OrderDetailStatus.REFUNDED;
    }

    private void ensureStatus(OrderDetailStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.ORDER_DETAIL_INVALID_STATUS);
        }
    }
}
