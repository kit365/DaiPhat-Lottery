package com.daiphat.coreapi.domain.model.refund;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundFundSource;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.order.refund.ReimburseStatus;
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
public class RefundRequestModel {

    private Long id;
    private RefundType refundType;
    /**
     * Derived from linked {@code OrderDetail}s (not persisted on refund_requests).
     * Populated when loading or after linking details for a customer order refund.
     */
    private UUID orderId;
    @Builder.Default
    private List<Long> orderDetailIds = new ArrayList<>();
    private UUID requestedBy;
    private RefundRequestRole requestRole;

    @Builder.Default
    private RefundRequestStatus status = RefundRequestStatus.PENDING;

    private BigDecimal refundAmount;
    private String refundReason;
    private Long bankAccountId;

    @Builder.Default
    private RefundFundSource fundSource = RefundFundSource.COMPANY_FUND;

    @Builder.Default
    private ReimburseStatus reimburseStatus = ReimburseStatus.NONE;

    @Builder.Default
    private int attemptNumber = 1;

    private String rejectReason;
    private UUID reviewedBy;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        if (this.status == null) {
            this.status = RefundRequestStatus.PENDING;
        }
        if (this.fundSource == null) {
            this.fundSource = RefundFundSource.COMPANY_FUND;
        }
        if (this.reimburseStatus == null) {
            this.reimburseStatus = ReimburseStatus.NONE;
        }
        if (this.attemptNumber <= 0) {
            this.attemptNumber = 1;
        }
    }

    public void initializeForAutoApprovedCancel() {
        this.status = RefundRequestStatus.READY_TO_PAY;
        this.fundSource = RefundFundSource.COMPANY_FUND;
        this.reimburseStatus = ReimburseStatus.NONE;
        this.attemptNumber = 1;
    }

    public void approve(UUID reviewerId) {
        ensureStatus(RefundRequestStatus.PENDING);
        this.status = RefundRequestStatus.APPROVED;
        this.reviewedBy = reviewerId;
        this.reviewedAt = LocalDateTime.now();
        this.rejectReason = null;
    }

    public void reject(UUID reviewerId, String reason) {
        ensureStatus(RefundRequestStatus.PENDING);
        if (reason == null || reason.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        this.status = RefundRequestStatus.REJECTED;
        this.reviewedBy = reviewerId;
        this.reviewedAt = LocalDateTime.now();
        this.rejectReason = reason.trim();
    }

    /** Marks refund as paid. Payout evidence is stored on the related Transaction. */
    public void markPaid() {
        if (this.status != RefundRequestStatus.APPROVED && this.status != RefundRequestStatus.READY_TO_PAY) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
        }
        this.status = RefundRequestStatus.PAID;
    }

    public void cancel() {
        ensureStatus(RefundRequestStatus.PENDING);
        this.status = RefundRequestStatus.CANCELLED;
    }

    public void expire() {
        if (this.status != RefundRequestStatus.PENDING
                && this.status != RefundRequestStatus.APPROVED
                && this.status != RefundRequestStatus.READY_TO_PAY) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
        }
        this.status = RefundRequestStatus.EXPIRED;
    }

    private void ensureStatus(RefundRequestStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
        }
    }
}
