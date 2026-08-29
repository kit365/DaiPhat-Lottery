package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimRejectionReason;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Domain model cho PrizeClaimSubmission.
 *
 * <p>Luồng: DRAFT → SUBMITTED → CONFIRMED → PAYMENT_PENDING → COMPLETED.
 * <p>Unhappy cases:
 * <ul>
 *   <li>Race condition serial: partial unique index → DataIntegrityViolationException
 *   <li>MismatchedStation: serial.stationId != lotterySupplierId
 *   <li>Maker-checker violation: submittedBy == confirmedBy / completedBy
 *   <li>UNDERPAID/OVERPAID settlement
 *   <li>Cancel: DRAFT tự do; SUBMITTED+ cần maker-checker
 * </ul>
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
    private BigDecimal totalCommissionAmount;
    private PrizeClaimSubmissionStatus status;
    private LocalDateTime submittedAt;
    private UUID submittedBy;
    private LocalDateTime confirmedAt;
    private UUID confirmedBy;
    private LocalDateTime completedAt;
    private UUID completedBy;
    private LocalDateTime cancelledAt;
    private UUID cancelledBy;
    private UUID approvedBy;
    private String confirmationReference;
    private String confirmationEvidenceUrl;
    private LocalDate paymentDeadline;
    private boolean overdue;
    private BigDecimal paidAmount;
    private PrizeClaimSubmissionSettlementStatus settlementStatus;
    private BigDecimal settlementDifferenceAmount;
    private String cancelReason;
    private String paymentNote;
    private java.util.List<String> paymentEvidenceUrls;

    // ─── State transitions ───────────────────────────────────────────────────

    public void submit(UUID staffId) {
        ensureStatus(PrizeClaimSubmissionStatus.DRAFT);
        if (staffId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Người gửi là bắt buộc.");
        }
        this.submittedBy = staffId;
        this.submittedAt = LocalDateTime.now();
        this.status = PrizeClaimSubmissionStatus.SUBMITTED;
    }

    /**
     * Xác nhận từ nhà đài.
     *
     * @param confRef       số biên bản nhà đài — bắt buộc
     * @param confEvidence  ảnh/PDF giấy xác nhận — bắt buộc
     * @param confirmStaffId người xác nhận — bắt buộc khác submittedBy (maker-checker)
     */
    public void confirm(String confRef, String confEvidence, UUID confirmStaffId) {
        ensureStatus(PrizeClaimSubmissionStatus.SUBMITTED);

        if (confRef == null || confRef.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Số biên bản xác nhận là bắt buộc.");
        }
        if (confEvidence == null || confEvidence.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Ảnh xác nhận từ nhà đài là bắt buộc.");
        }
        if (confirmStaffId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Người xác nhận là bắt buộc.");
        }
        if (confirmStaffId.equals(submittedBy)) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_FOUR_EYES_REQUIRED,
                    "Người xác nhận phải khác người gửi phiếu (maker-checker). Không được tự xác nhận phiếu mình gửi.");
        }

        this.confirmationReference = confRef.trim();
        this.confirmationEvidenceUrl = confEvidence.trim();
        this.confirmedBy = confirmStaffId;
        this.confirmedAt = LocalDateTime.now();
        this.status = PrizeClaimSubmissionStatus.CONFIRMED;
    }

    public void markPaymentPending() {
        ensureStatus(PrizeClaimSubmissionStatus.CONFIRMED);
        this.status = PrizeClaimSubmissionStatus.PAYMENT_PENDING;
    }

    /**
     * Hoàn thành thanh toán từ nhà đài.
     *
     * <p>Settlement logic:
     * <ul>
     *   <li>FULL: paidAmount == totalNetClaimAmount
     *   <li>UNDERPAID: paidAmount < totalNetClaimAmount → tạo công nợ nhà đài
     *   <li>OVERPAID: paidAmount > totalNetClaimAmount → ghi refund obligation, không cộng vào doanh thu
     * </ul>
     *
     * @param completeStaffId người hoàn thành — bắt buộc khác submittedBy (maker-checker)
     */
    public void complete(
            BigDecimal paidAmt,
            java.util.List<String> paymentEvidenceUrls,
            String paymentNote,
            UUID completeStaffId) {

        ensureStatus(PrizeClaimSubmissionStatus.PAYMENT_PENDING);

        if (paymentEvidenceUrls == null || paymentEvidenceUrls.isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Chứng từ thanh toán là bắt buộc.");
        }
        if (completeStaffId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Người hoàn thành là bắt buộc.");
        }
        if (completeStaffId.equals(submittedBy)) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_FOUR_EYES_REQUIRED,
                    "Người hoàn thành phải khác người gửi phiếu (maker-checker). Không được tự hoàn thành phiếu mình gửi.");
        }

        BigDecimal actualPaid = paidAmt != null ? paidAmt : BigDecimal.ZERO;
        this.paidAmount = actualPaid;
        this.paymentEvidenceUrls = new java.util.ArrayList<>(paymentEvidenceUrls);
        this.paymentNote = paymentNote;
        this.completedBy = completeStaffId;
        this.completedAt = LocalDateTime.now();

        // Settlement: so sánh vs tổng claim
        BigDecimal claimed = totalNetClaimAmount != null ? totalNetClaimAmount : BigDecimal.ZERO;
        int cmp = actualPaid.compareTo(claimed);
        if (cmp < 0) {
            this.settlementStatus = PrizeClaimSubmissionSettlementStatus.UNDERPAID;
            this.settlementDifferenceAmount = claimed.subtract(actualPaid);
        } else if (cmp > 0) {
            this.settlementStatus = PrizeClaimSubmissionSettlementStatus.OVERPAID;
            this.settlementDifferenceAmount = actualPaid.subtract(claimed);
        } else {
            this.settlementStatus = PrizeClaimSubmissionSettlementStatus.FULL;
            this.settlementDifferenceAmount = BigDecimal.ZERO;
        }

        this.status = PrizeClaimSubmissionStatus.COMPLETED;
    }

    /**
     * Hủy phiếu nộp.
     *
     * <ul>
     *   <li>DRAFT: hủy tự do, cancelReason optional
     *   <li>SUBMITTED+: cancelReason bắt buộc + maker-checker (approvedBy != submittedBy)
     * </ul>
     */
    public void cancel(String cancelReason, UUID cancelledBy, UUID approver) {
        if (cancelledBy == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Người hủy là bắt buộc.");
        }

        if (status == PrizeClaimSubmissionStatus.DRAFT) {
            // DRAFT: hủy tự do
            this.cancelReason = cancelReason;
            this.cancelledBy = cancelledBy;
            this.cancelledAt = LocalDateTime.now();
            this.status = PrizeClaimSubmissionStatus.CANCELLED;
            return;
        }

        if (status == PrizeClaimSubmissionStatus.COMPLETED) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Không thể hủy phiếu đã hoàn thành.");
        }

        // SUBMITTED trở lên: cần lý do + maker-checker
        if (cancelReason == null || cancelReason.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Lý do hủy là bắt buộc khi đã gửi phiếu.");
        }
        if (approver == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Người duyệt hủy là bắt buộc.");
        }
        if (approver.equals(submittedBy)) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_FOUR_EYES_REQUIRED,
                    "Người duyệt hủy phải khác người gửi phiếu (maker-checker).");
        }

        this.cancelReason = cancelReason.trim();
        this.cancelledBy = cancelledBy;
        this.cancelledAt = LocalDateTime.now();
        this.approvedBy = approver;
        this.status = PrizeClaimSubmissionStatus.CANCELLED;
    }

    // ─── Guards ──────────────────────────────────────────────────────────────

    /**
     * Guard mismatchedStation: serial thuộc nhà đài nào?
     * Mỗi line khi add cần check serial.stationId == submission.lotterySupplierId.
     * Lỗi ném tại service layer, không trong model này (model chỉ nhận dữ liệu đã validated).
     */

    private void ensureStatus(PrizeClaimSubmissionStatus expected) {
        if (status != expected) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Trạng thái không hợp lệ cho thao tác này. Mong đợi: " + expected + ", hiện tại: " + status);
        }
    }
}
