package com.daiphat.coreapi.domain.model.refund;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequestModel {

    private Long id;
    private RefundType refundType;
    private UUID orderId;
    private Long orderDetailId;
    private UUID requestedBy;
    private RefundRequestRole requestRole;

    @Builder.Default
    private RefundRequestStatus status = RefundRequestStatus.PENDING;

    private BigDecimal refundAmount;
    private String refundReason;
    private Long bankAccountId;
    private String rejectReason;
    private UUID reviewedBy;
    private LocalDateTime reviewedAt;
    private String transferEvidenceUrl;
    private LocalDateTime transferredAt;
    private UUID transferredBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        if (this.status == null) {
            this.status = RefundRequestStatus.PENDING;
        }
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

    public void markTransferred(UUID transferrerId, String evidenceUrl) {
        ensureStatus(RefundRequestStatus.APPROVED);
        if (evidenceUrl == null || evidenceUrl.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        this.status = RefundRequestStatus.TRANSFERRED;
        this.transferredBy = transferrerId;
        this.transferredAt = LocalDateTime.now();
        this.transferEvidenceUrl = evidenceUrl.trim();
    }

    private void ensureStatus(RefundRequestStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
        }
    }
}
