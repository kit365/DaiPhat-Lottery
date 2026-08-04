package com.daiphat.coreapi.domain.model.payout;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutOwnershipVerificationLevel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutTicketOrigin;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrizePayoutRequestModel {

    public static final String MANUAL_RESOLUTION_NOTE =
            "Vượt quá số lần gửi yêu cầu trả thưởng online. Vui lòng mang CCCD và vé đến đại lý đổi thưởng hoặc liên hệ CSKH để được hỗ trợ!";

    public static final String OUT_OF_SCOPE_TICKET_MESSAGE =
            "Không tìm thấy vé trong hệ thống DaiPhat — vé ngoài phạm vi hỗ trợ";

    private Long id;
    private String requestCode;
    private UUID customerId;
    private UUID orderId;
    private Long orderDetailId;
    private Long serialId;
    private String prizeCode;
    private String prizeDisplayName;
    private BigDecimal grossAmount;
    private BigDecimal taxAmount;
    private BigDecimal commissionAmount;
    private BigDecimal netAmount;
    private PrizePayoutChannel channel;
    private PrizePayoutTicketOrigin ticketOrigin;
    private PrizePayoutOwnershipVerificationLevel ownershipVerificationLevel;
    private boolean manualOwnershipConfirmed;
    private PrizePayoutPaymentMethod paymentMethod;
    /** Cash portion for CASH / COMBINED. */
    private BigDecimal cashAmount;
    /** Transfer portion for TRANSFER / COMBINED. */
    private BigDecimal transferAmount;
    private Long bankAccountId;
    private String bankName;
    private String bankAccountNumber;
    private String accountHolderName;
    private String recipientFullName;
    private String recipientIdNumber;
    private String recipientIdImageUrl;
    private String recipientIdImageBackUrl;
    private LocalDateTime recipientIdentityCapturedAt;

    @Builder.Default
    private PrizePayoutRequestStatus status = PrizePayoutRequestStatus.PENDING;

    @Builder.Default
    private int rejectCount = 0;

    private String rejectReason;
    private String transferEvidenceUrl;
    private String confirmationContractUrl;
    private LocalDateTime completedAt;
    private UUID completedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        this.status = PrizePayoutRequestStatus.PENDING;
        if (this.rejectCount < 0) {
            this.rejectCount = 0;
        }
    }

    public void markApproved(UUID staffId) {
        ensureStatus(PrizePayoutRequestStatus.PENDING);
        this.status = PrizePayoutRequestStatus.APPROVED;
        this.rejectReason = null;
        this.lastModifiedBy = staffId != null ? staffId.toString() : this.lastModifiedBy;
    }

    public void markCompleted(UUID staffId, PrizePayoutPaymentMethod method, String transferEvidenceUrl) {
        if (status != PrizePayoutRequestStatus.PENDING && status != PrizePayoutRequestStatus.APPROVED) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Trạng thái yêu cầu trả thưởng không hợp lệ cho thao tác này.");
        }
        if (method == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Phương thức thanh toán là bắt buộc.");
        }
        boolean needsTransferEvidence = method == PrizePayoutPaymentMethod.TRANSFER
                || (method == PrizePayoutPaymentMethod.COMBINED
                && transferAmount != null
                && transferAmount.compareTo(BigDecimal.ZERO) > 0);
        if (needsTransferEvidence) {
            if (transferEvidenceUrl == null || transferEvidenceUrl.isBlank()) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Ảnh biên lai chuyển khoản là bắt buộc.");
            }
            this.transferEvidenceUrl = transferEvidenceUrl;
        } else {
            this.transferEvidenceUrl = transferEvidenceUrl != null && !transferEvidenceUrl.isBlank()
                    ? transferEvidenceUrl
                    : null;
        }
        this.paymentMethod = method;
        this.status = PrizePayoutRequestStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
        this.completedBy = staffId;
        this.rejectReason = null;
    }

    /**
     * Staff rejects a pending or approved request.
     * For ONLINE channel, {@code newRejectCount} is the cumulative reject count for the serial;
     * when it reaches {@code maxOnlineReject}, status becomes {@link PrizePayoutRequestStatus#MANUAL_RESOLUTION}.
     */
    public void markRejected(String reason, UUID staffId, int newRejectCount, int maxOnlineReject) {
        if (status != PrizePayoutRequestStatus.PENDING && status != PrizePayoutRequestStatus.APPROVED) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Trạng thái yêu cầu trả thưởng không hợp lệ cho thao tác này.");
        }
        if (reason == null || reason.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Lý do từ chối là bắt buộc.");
        }

        int maxRetry = maxOnlineReject > 0 ? maxOnlineReject : 3;
        boolean online = this.channel == PrizePayoutChannel.ONLINE;
        int appliedCount = online ? Math.max(newRejectCount, 1) : 0;
        this.rejectCount = appliedCount;
        this.completedAt = LocalDateTime.now();
        this.completedBy = staffId;
        this.transferEvidenceUrl = null;

        if (online && appliedCount >= maxRetry) {
            this.status = PrizePayoutRequestStatus.MANUAL_RESOLUTION;
            this.rejectReason = MANUAL_RESOLUTION_NOTE;
            return;
        }

        this.status = PrizePayoutRequestStatus.REJECTED;
        this.rejectReason = reason.trim();
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

    public static boolean isOpenStatus(PrizePayoutRequestStatus status) {
        return status == PrizePayoutRequestStatus.PENDING || status == PrizePayoutRequestStatus.APPROVED;
    }

    public static EnumSet<PrizePayoutRequestStatus> openStatuses() {
        return EnumSet.of(PrizePayoutRequestStatus.PENDING, PrizePayoutRequestStatus.APPROVED);
    }
}
