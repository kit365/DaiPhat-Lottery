package com.daiphat.coreapi.domain.model.payout;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrizePayoutRequestModel {

    private Long id;
    private String requestCode;
    private UUID customerId;
    private UUID orderId;
    private Long orderDetailId;
    private Long serialId;
    private String prizeCode;
    private String prizeDisplayName;
    private BigDecimal grossAmount;
    private Long bankAccountId;
    private String bankName;
    private String bankAccountNumber;
    private String accountHolderName;

    @Builder.Default
    private PrizePayoutRequestStatus status = PrizePayoutRequestStatus.PENDING;

    private String rejectReason;
    private String transferEvidenceUrl;
    private LocalDateTime completedAt;
    private UUID completedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        this.status = PrizePayoutRequestStatus.PENDING;
    }

    public void markCompleted(UUID staffId, String transferEvidenceUrl) {
        ensureStatus(PrizePayoutRequestStatus.PENDING);
        if (transferEvidenceUrl == null || transferEvidenceUrl.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Ảnh biên lai chuyển khoản là bắt buộc.");
        }
        this.status = PrizePayoutRequestStatus.COMPLETED;
        this.transferEvidenceUrl = transferEvidenceUrl;
        this.completedAt = LocalDateTime.now();
        this.completedBy = staffId;
        this.rejectReason = null;
    }

    public void markRejected(String reason, UUID staffId) {
        ensureStatus(PrizePayoutRequestStatus.PENDING);
        if (reason == null || reason.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Lý do từ chối là bắt buộc.");
        }
        this.status = PrizePayoutRequestStatus.REJECTED;
        this.rejectReason = reason.trim();
        this.completedAt = LocalDateTime.now();
        this.completedBy = staffId;
        this.transferEvidenceUrl = null;
    }

    public void markCancelled() {
        ensureStatus(PrizePayoutRequestStatus.PENDING);
        this.status = PrizePayoutRequestStatus.CANCELLED;
        this.completedAt = LocalDateTime.now();
        this.completedBy = null;
    }

    private void ensureStatus(PrizePayoutRequestStatus expected) {
        if (status != expected) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Trạng thái yêu cầu trả thưởng không hợp lệ cho thao tác này.");
        }
    }
}
