package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Domain model cho PrizeClaimSubmission.
 *
 * <p>Luồng: DRAFT → INSPECTING → PENDING_HANDOVER → HANDED_OVER → CLOSED.
 */
@Getter
@Builder
public class PrizeClaimSubmissionModel {

    private Long id;
    private String submissionCode;
    private Long lotterySupplierId;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private Integer totalTicketCount;
    private BigDecimal totalGrossPrizeAmount;
    private BigDecimal totalNetClaimAmount;
    private BigDecimal totalTaxAmount;
    private BigDecimal totalCommissionAmount;
    private PrizeClaimSubmissionStatus status;
    private ReturnDeliveryMode deliveryMode;
    private String handoverEvidenceUrl;
    private String handoverReceiptUrl;
    private String supplierReference;
    private String handoverNote;
    private LocalDateTime handedOverAt;
    private UUID handedOverBy;
    private LocalDateTime submittedAt;
    private UUID submittedBy;
    private LocalDateTime cancelledAt;
    private UUID cancelledBy;
    private String cancelReason;
    private boolean needsOutcome;

    public void startInspection() {
        ensureStatus(PrizeClaimSubmissionStatus.DRAFT);
        this.status = PrizeClaimSubmissionStatus.INSPECTING;
    }

    public void confirmInspection(ReturnDeliveryMode deliveryMode, UUID operatorId) {
        if (status != PrizeClaimSubmissionStatus.DRAFT && status != PrizeClaimSubmissionStatus.INSPECTING) {
            throw invalidStatus();
        }
        if (deliveryMode == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Hình thức giao nộp là bắt buộc.");
        }
        if (operatorId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Người thao tác là bắt buộc.");
        }
        this.deliveryMode = deliveryMode;
        this.status = PrizeClaimSubmissionStatus.PENDING_HANDOVER;
    }

    public void confirmHandover(
            String handoverEvidenceUrl,
            String handoverReceiptUrl,
            String supplierReference,
            String note,
            UUID operatorId) {
        ensureStatus(PrizeClaimSubmissionStatus.PENDING_HANDOVER);
        if (operatorId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Người bàn giao là bắt buộc.");
        }
        if (handoverEvidenceUrl == null || handoverEvidenceUrl.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Ảnh bằng chứng bàn giao là bắt buộc.");
        }
        this.handoverEvidenceUrl = handoverEvidenceUrl.trim();
        this.handoverReceiptUrl = trimToNull(handoverReceiptUrl);
        this.supplierReference = trimToNull(supplierReference);
        this.handoverNote = trimToNull(note);
        this.handedOverBy = operatorId;
        this.handedOverAt = LocalDateTime.now();
        this.submittedBy = operatorId;
        this.submittedAt = this.handedOverAt;
        this.status = PrizeClaimSubmissionStatus.HANDED_OVER;
    }

    /** Hủy phiếu — chỉ trước khi bàn giao xong. */
    public void cancel(String cancelReason, UUID cancelledBy) {
        if (status == null || !status.isCancellable()) {
            throw invalidStatus();
        }
        if (cancelledBy == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Người hủy là bắt buộc.");
        }
        this.cancelReason = cancelReason;
        this.cancelledBy = cancelledBy;
        this.cancelledAt = LocalDateTime.now();
        this.status = PrizeClaimSubmissionStatus.CANCELLED;
    }

    /** Đóng phiếu khi tất cả vé đã có kết quả. */
    public void close() {
        ensureStatus(PrizeClaimSubmissionStatus.HANDED_OVER);
        this.status = PrizeClaimSubmissionStatus.CLOSED;
    }

    public void markNeedsOutcome() {
        this.needsOutcome = true;
    }

    private void ensureStatus(PrizeClaimSubmissionStatus expected) {
        if (status != expected) {
            throw invalidStatus();
        }
    }

    private DomainException invalidStatus() {
        return new DomainException(
                ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                "Trạng thái không hợp lệ cho thao tác này. Hiện tại: " + status);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
