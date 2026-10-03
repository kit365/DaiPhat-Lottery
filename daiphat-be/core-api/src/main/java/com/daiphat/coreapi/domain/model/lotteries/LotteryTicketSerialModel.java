package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
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
    private TicketCondition ticketCondition = TicketCondition.GOOD;

    @Builder.Default
    private SerialPayoutState payoutState = SerialPayoutState.NONE;

    @Builder.Default
    private InputSource inputSource = InputSource.MANUAL;

    private LocalDateTime reservedAt;
    private LocalDateTime reservationExpiresAt;
    private UUID reservedByOrderId;
    private Long reservedByAllocationBatchId;
    @Builder.Default private boolean lucky = false;
    private String luckyBadges;
    private UUID importedById;
    private LocalDateTime importedAt;

    @Builder.Default
    private boolean verified = false;

    private UUID verifiedById;
    private LocalDateTime verifiedAt;
    private LocalDateTime returnedAt;
    @Builder.Default
    private boolean manualOverride = false;
    private String overrideReason;
    private String overrideEvidenceUrl;
    private Long returnBatchLineId;
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
        this.ticketCondition = TicketCondition.GOOD;
        this.verified = false;
        this.verifiedById = null;
        this.verifiedAt = null;
        this.returnedAt = null;
        this.returnBatchLineId = null;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
        this.faultedBy = null;
        this.damagedEvidenceUrl = null;
        this.damagedReason = null;
    }

    /** Replaced by another serial after a data-entry cancel — not inventory, not sellable. */
    public boolean isVoided() {
        return this.ticketCondition != null && this.ticketCondition.isVoided();
    }

    /** Serials that still exist as physical inventory (VOIDED replacements are excluded). */
    public boolean isVisibleInventory() {
        return this.deletedAt == null && !isVoided();
    }

    /** Sellable inventory: in stock, good condition, not linked to a return batch line. */
    public boolean isAvailableForSale() {
        return this.status == LotteryTicketSerialStatus.IN_STOCK
                && this.ticketCondition == TicketCondition.GOOD
                && this.returnBatchLineId == null
                && this.deletedAt == null
                && !isVoided();
    }

    public void reserve(UUID orderId, LocalDateTime expiresAt) {
        ensureAvailableForSale();
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
                && this.status != LotteryTicketSerialStatus.RESERVED) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        if (this.status == LotteryTicketSerialStatus.IN_STOCK && !isAvailableForSale()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        this.status = LotteryTicketSerialStatus.SOLD;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
    }

    public void sellOffline() {
        ensureNotLockedForPayout();
        ensureAvailableForSale();
        this.status = LotteryTicketSerialStatus.SOLD;
    }

    public void returnSoldToStock() {
        if (this.status == LotteryTicketSerialStatus.IN_STOCK) {
            this.reservedAt = null;
            this.reservationExpiresAt = null;
            this.reservedByOrderId = null;
            return;
        }
        if (this.status != LotteryTicketSerialStatus.SOLD
                && this.status != LotteryTicketSerialStatus.RESERVED) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        this.status = LotteryTicketSerialStatus.IN_STOCK;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
    }

    public void expire() {
        if (isVoided()) {
            return;
        }
        if (this.status != LotteryTicketSerialStatus.IN_STOCK
                && this.status != LotteryTicketSerialStatus.RESERVED) {
            return;
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
        applyConditionFault(TicketCondition.DAMAGED, faultedBy, reason);
        this.damagedEvidenceUrl = evidenceUrl != null && !evidenceUrl.isBlank() ? evidenceUrl.trim() : null;
    }

    public void markLost(LotteryTicketSerialFaultedBy faultedBy, String reason) {
        applyConditionFault(TicketCondition.LOST, faultedBy, reason);
        // LOST incidents do not keep damage evidence.
        this.damagedEvidenceUrl = null;
    }

    public void markVoided(LotteryTicketSerialFaultedBy faultedBy, String reason) {
        applyConditionFault(TicketCondition.VOIDED, faultedBy, reason);
        this.damagedEvidenceUrl = null;
    }

    /** Move this physical serial onto another lottery number without cloning. */
    public void reassignToTicket(Long newTicketId, Long newStationId, LocalDate newDrawDate) {
        if (newTicketId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Vé số đích không được để trống.");
        }
        this.ticketId = newTicketId;
        if (newStationId != null) {
            this.stationId = newStationId;
        }
        if (newDrawDate != null) {
            this.drawDate = newDrawDate;
        }
        this.replacedForTicketId = null;
    }

    public boolean isInternalInventoryIncidentStatus() {
        return this.status == LotteryTicketSerialStatus.IN_STOCK;
    }

    public boolean isActiveTransactionIncidentStatus() {
        return this.status == LotteryTicketSerialStatus.RESERVED;
    }

    public boolean isIncidentMutableStatus() {
        return isInternalInventoryIncidentStatus() || isActiveTransactionIncidentStatus();
    }

    public boolean isTerminalIncidentStatus() {
        if (this.ticketCondition != null && this.ticketCondition.isIncidentReported()) {
            return true;
        }
        return !isIncidentMutableStatus();
    }

    /** Only call after verifying that the owning order detail still awaits handover. */
    public void reportAwaitingHandoverFault(
            TicketCondition condition,
            LotteryTicketSerialFaultedBy faultedBy,
            String reason,
            String evidenceUrl
    ) {
        ensureNotLockedForPayout();
        if (condition != TicketCondition.DAMAGED && condition != TicketCondition.LOST) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Loại sự cố vé không hợp lệ.");
        }
        if (isVoided() || this.deletedAt != null || this.returnBatchLineId != null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        if (this.status == LotteryTicketSerialStatus.EXPIRED) {
            if (faultedBy == null || reason == null || reason.isBlank()) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu thông tin báo lỗi vé.");
            }
            this.ticketCondition = condition;
            this.faultedBy = faultedBy;
            this.damagedReason = reason.trim();
            this.status = LotteryTicketSerialStatus.CANCELLED;
            this.reservedAt = null;
            this.reservationExpiresAt = null;
            this.reservedByOrderId = null;
        } else {
            applyConditionFault(condition, faultedBy, reason);
        }
        this.damagedEvidenceUrl = condition == TicketCondition.DAMAGED
                && evidenceUrl != null && !evidenceUrl.isBlank() ? evidenceUrl.trim() : null;
    }

    /**
     * Records a terminal incident discovered while reconciling tickets already prepared
     * for supplier return. The return-line link is intentionally retained for audit.
     */
    public void reportReturnDiscrepancyFault(
            TicketCondition condition,
            LotteryTicketSerialFaultedBy faultedBy,
            String reason,
            String evidenceUrl
    ) {
        ensureNotLockedForPayout();
        if (this.returnBatchLineId == null || this.deletedAt != null) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Chỉ được xử lý vé đang thuộc phiếu trả nhà cung cấp."
            );
        }
        if (this.status != LotteryTicketSerialStatus.IN_STOCK
                && this.status != LotteryTicketSerialStatus.EXPIRED) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Sê-ri không còn đủ điều kiện xử lý chênh lệch trả."
            );
        }
        if (this.ticketCondition != TicketCondition.GOOD) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Chỉ được xử lý sê-ri đang ở tình trạng tốt."
            );
        }
        if (condition != TicketCondition.DAMAGED
                && condition != TicketCondition.LOST
                && condition != TicketCondition.VOIDED) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Loại sự cố vé không hợp lệ.");
        }
        if (faultedBy == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cần chỉ định nguồn gây lỗi (faultedBy).");
        }

        this.status = LotteryTicketSerialStatus.CANCELLED;
        this.ticketCondition = condition;
        this.faultedBy = faultedBy;
        this.damagedReason = reason != null && !reason.isBlank() ? reason.trim() : null;
        this.damagedEvidenceUrl = condition == TicketCondition.DAMAGED
                && evidenceUrl != null && !evidenceUrl.isBlank() ? evidenceUrl.trim() : null;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
    }

    private void applyConditionFault(
            TicketCondition condition,
            LotteryTicketSerialFaultedBy faultedBy,
            String reason
    ) {
        if (faultedBy == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cần chỉ định nguồn gây lỗi (faultedBy).");
        }
        if (!isIncidentMutableStatus() && this.status != LotteryTicketSerialStatus.SOLD) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_INVALID_STATUS,
                    "Không thể báo sự cố cho sê-ri ở trạng thái " + this.status.getDisplayName()
                            + " (chỉ đọc để tra cứu)."
            );
        }
        // A physical incident is terminal for this serial. Keep the previous
        // status in the service before this transition so order/refund handling
        // can still distinguish inventory, reserved and sold incidents.
        this.status = LotteryTicketSerialStatus.CANCELLED;
        this.ticketCondition = condition;
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

    public boolean isEditableStatus() {
        return isAvailableForSale();
    }

    public boolean isSoftDeletableStatus() {
        return this.status == LotteryTicketSerialStatus.IN_STOCK
                || this.status == LotteryTicketSerialStatus.EXPIRED
                || (this.ticketCondition != null && this.ticketCondition.isIncidentReported());
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    private void ensureStatus(LotteryTicketSerialStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
    }

    private void ensureAvailableForSale() {
        if (!isAvailableForSale()) {
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
