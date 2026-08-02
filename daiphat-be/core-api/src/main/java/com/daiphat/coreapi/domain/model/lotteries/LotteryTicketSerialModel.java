package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryTicketSerialModel {

    private Long id;
    private Long ticketId;
    private Long importBatchId;
    private Long importBatchLineId;
    private String ticketImg;
    private String serialNumber;
    private Long stationId;
    private LocalDate drawDate;

    @Builder.Default
    private LotteryTicketSerialStatus status = LotteryTicketSerialStatus.IN_STOCK;

    @Builder.Default
    private SerialPayoutState payoutState = SerialPayoutState.NONE;

    @Builder.Default
    private InputSource inputSource = InputSource.MANUAL;

    private LocalDateTime reservedAt;
    private LocalDateTime reservationExpiresAt;
    private UUID reservedByOrderId;
    private UUID importedById;
    private LocalDateTime importedAt;

    @Builder.Default
    private boolean verified = false;

    private UUID verifiedById;
    private LocalDateTime verifiedAt;
    private LocalDateTime returnedAt;
    private LotteryTicketSerialFaultedBy faultedBy;
    private String damagedEvidenceUrl;
    private String damagedReason;
    private Long replacedForTicketId;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeImport(UUID importedById) {
        this.importedById = importedById;
        this.importedAt = LocalDateTime.now();
        this.status = LotteryTicketSerialStatus.IN_STOCK;
        this.verified = false;
        this.verifiedById = null;
        this.verifiedAt = null;
        this.returnedAt = null;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
        this.faultedBy = null;
        this.damagedEvidenceUrl = null;
        this.damagedReason = null;
    }

    public void reserve(UUID orderId, LocalDateTime expiresAt) {
        ensureStatus(LotteryTicketSerialStatus.IN_STOCK);
        this.status = LotteryTicketSerialStatus.RESERVED;
        this.reservedAt = LocalDateTime.now();
        this.reservationExpiresAt = expiresAt;
        this.reservedByOrderId = orderId;
    }

    public void releaseReservation() {
        ensureStatus(LotteryTicketSerialStatus.RESERVED);
        this.status = LotteryTicketSerialStatus.IN_STOCK;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
    }

    /**
     * After online payment succeeds: shop holds the serial for staff inspection.
     * Keeps {@code reservedByOrderId} so incident/replace still works during PREPARING.
     * Final {@link #sellOnline()} happens when the order moves to PENDING_PICKUP.
     */
    public void confirmPaidProxyHolding(UUID orderId) {
        if (this.status != LotteryTicketSerialStatus.IN_STOCK
                && this.status != LotteryTicketSerialStatus.RESERVED) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        if (orderId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu mã đơn khi xác nhận giữ hộ vé đã thanh toán.");
        }
        assumeProxyHolding(orderId);
    }

    public void sellOnline() {
        ensureNotLockedForPayout();
        // Idempotent: legacy payment already set SOLD before PENDING_PICKUP.
        // Must not throw — a DomainException from @Transactional markSold marks the
        // outer order-status transaction rollback-only even if the caller catches it.
        if (this.status == LotteryTicketSerialStatus.SOLD) {
            this.reservedAt = null;
            this.reservationExpiresAt = null;
            this.reservedByOrderId = null;
            return;
        }
        if (this.status != LotteryTicketSerialStatus.IN_STOCK
                && this.status != LotteryTicketSerialStatus.RESERVED
                && this.status != LotteryTicketSerialStatus.PROXY_HOLDING) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        this.status = LotteryTicketSerialStatus.SOLD;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
    }

    public void sellOffline() {
        ensureNotLockedForPayout();
        ensureStatus(LotteryTicketSerialStatus.IN_STOCK);
        this.status = LotteryTicketSerialStatus.SOLD;
    }

    public void returnSoldToStock() {
        if (this.status != LotteryTicketSerialStatus.SOLD) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        this.status = LotteryTicketSerialStatus.IN_STOCK;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
    }

    public void expire() {
        if (this.status != LotteryTicketSerialStatus.IN_STOCK
                && this.status != LotteryTicketSerialStatus.RESERVED
                && this.status != LotteryTicketSerialStatus.PROXY_HOLDING) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        this.status = LotteryTicketSerialStatus.EXPIRED;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
    }

    public void markDamaged(LotteryTicketSerialFaultedBy faultedBy, String reason) {
        markDamaged(faultedBy, reason, null);
    }

    public void markDamaged(LotteryTicketSerialFaultedBy faultedBy, String reason, String evidenceUrl) {
        markFaulted(LotteryTicketSerialStatus.DAMAGED, faultedBy, reason);
        this.damagedEvidenceUrl = evidenceUrl != null && !evidenceUrl.isBlank() ? evidenceUrl.trim() : null;
    }

    public void markLost(LotteryTicketSerialFaultedBy faultedBy, String reason) {
        markFaulted(LotteryTicketSerialStatus.LOST, faultedBy, reason);
        // LOST incidents do not keep damage evidence.
        this.damagedEvidenceUrl = null;
    }

    public void markVoided(LotteryTicketSerialFaultedBy faultedBy, String reason) {
        markFaulted(LotteryTicketSerialStatus.VOIDED, faultedBy, reason);
        this.damagedEvidenceUrl = null;
    }

    public boolean isInternalInventoryIncidentStatus() {
        return this.status == LotteryTicketSerialStatus.IN_STOCK;
    }

    public boolean isActiveTransactionIncidentStatus() {
        return this.status == LotteryTicketSerialStatus.RESERVED
                || this.status == LotteryTicketSerialStatus.PROXY_HOLDING;
    }

    public boolean isIncidentMutableStatus() {
        return isInternalInventoryIncidentStatus() || isActiveTransactionIncidentStatus();
    }

    public boolean isTerminalIncidentStatus() {
        return !isIncidentMutableStatus();
    }

    private void markFaulted(
            LotteryTicketSerialStatus faultStatus,
            LotteryTicketSerialFaultedBy faultedBy,
            String reason
    ) {
        if (faultedBy == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cần chỉ định nguồn gây lỗi (faultedBy).");
        }
        // SOLD: allow from order-inspection path when serial was marked sold too early
        // (legacy online payment). Warehouse reportFault still blocks SOLD via isTerminalIncidentStatus().
        if (!isIncidentMutableStatus() && this.status != LotteryTicketSerialStatus.SOLD) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Không thể báo sự cố cho sê-ri ở trạng thái " + this.status.getDisplayName()
                            + " (chỉ đọc để tra cứu)."
            );
        }
        this.status = faultStatus;
        this.faultedBy = faultedBy;
        this.damagedReason = reason != null && !reason.isBlank() ? reason.trim() : null;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
    }

    public void assumeReservedForOrder(UUID orderId, LocalDateTime expiresAt) {
        this.status = LotteryTicketSerialStatus.RESERVED;
        this.reservedAt = LocalDateTime.now();
        this.reservationExpiresAt = expiresAt;
        this.reservedByOrderId = orderId;
    }

    public void assumeProxyHolding(UUID orderId) {
        this.status = LotteryTicketSerialStatus.PROXY_HOLDING;
        this.reservedByOrderId = orderId;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
    }

    public boolean isEditableStatus() {
        return this.status == LotteryTicketSerialStatus.IN_STOCK;
    }

    public boolean isSoftDeletableStatus() {
        return this.status == LotteryTicketSerialStatus.IN_STOCK
                || this.status == LotteryTicketSerialStatus.EXPIRED
                || this.status == LotteryTicketSerialStatus.DAMAGED
                || this.status == LotteryTicketSerialStatus.LOST;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    private void ensureStatus(LotteryTicketSerialStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
    }

    public void lockForPayout() {
        if (payoutState == SerialPayoutState.PAID_OUT) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ALREADY_REQUESTED, "Vé đã được trả thưởng.");
        }
        if (payoutState == SerialPayoutState.PAYOUT_PENDING) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ALREADY_REQUESTED, "Vé đang có yêu cầu trả thưởng.");
        }
        this.payoutState = SerialPayoutState.PAYOUT_PENDING;
    }

    public void unlockPayout() {
        if (payoutState == SerialPayoutState.PAYOUT_PENDING) {
            this.payoutState = SerialPayoutState.NONE;
        }
    }

    public void markPaidOut() {
        this.payoutState = SerialPayoutState.PAID_OUT;
    }

    private void ensureNotLockedForPayout() {
        if (payoutState == SerialPayoutState.PAYOUT_PENDING) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_BLOCKS_PICKUP);
        }
    }
}
