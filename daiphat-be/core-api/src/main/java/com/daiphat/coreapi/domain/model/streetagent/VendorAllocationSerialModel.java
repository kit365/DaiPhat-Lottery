package com.daiphat.coreapi.domain.model.streetagent;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationSerialStatus;
import com.daiphat.coreapi.domain.service.streetagent.VendorTicketSellabilityPolicy;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.*;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class VendorAllocationSerialModel {
    private Long id;
    private Long allocationBatchId;
    private Long allocationBatchDetailId;
    /** Logical ticket id — must match serial's ticket. */
    private Long lotteryTicketId;
    private Long serialId;
    private Long stationId;
    private String stationName;
    private String ticketNumbers;
    private String serialNumber;
    private LocalDate drawDate;
    private LocalTime drawTime;
    private LocalTime supplierReturnCutoffTime;
    private List<DayOfWeek> drawDays;
    @Builder.Default
    private boolean stationActive = true;
    @Builder.Default
    private boolean ticketActive = true;
    private LotteryTicketStatus ticketAggregateStatus;
    private BigDecimal faceValue;
    private LotteryTicketSerialStatus ticketStatus;
    private TicketCondition ticketCondition;
    private Long returnBatchLineId;
    private Long vendorReturnBatchLineId;
    private String returnRejectionReason;
    private boolean lucky;
    private String luckyBadges;
    private AllocationSerialStatus status;
    private LocalDateTime reservedAt;
    private LocalDateTime reservedExpiresAt;
    private LocalDateTime returnedAt;
    private LocalDateTime soldAt;
    private boolean luckyOverride;
    private String luckyOverrideReason;
    private UUID luckyOverrideBy;
    private LocalDateTime luckyOverrideAt;

    public boolean isEligibleForDraft(LocalDate businessDate) {
        return VendorTicketSellabilityPolicy.isSellableForVendor(this, businessDate);
    }

    public boolean isInventoryAvailable() {
        return ticketStatus == LotteryTicketSerialStatus.IN_STOCK
                && ticketCondition == TicketCondition.GOOD
                && returnBatchLineId == null;
    }

    public boolean isPastDrawNow() {
        return VendorTicketSellabilityPolicy.isPastDraw(drawDate, drawTime);
    }

    /** Evaluates expiry at the command timestamp, rather than reading the clock again. */
    public boolean isPastDrawAt(LocalDateTime at) {
        if (at == null || drawDate == null) {
            return true;
        }
        if (drawDate.isBefore(at.toLocalDate())) {
            return true;
        }
        if (drawDate.isAfter(at.toLocalDate()) || drawTime == null) {
            return false;
        }
        return !at.toLocalTime().isBefore(drawTime);
    }

    /**
     * Ensures stock.lotteryTicketId matches the physical serial's ticket (DomainException, not assert).
     */
    public void requireTicketMatchesSerial(Long serialTicketId) {
        if (serialId == null) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        if (serialTicketId == null || lotteryTicketId == null || !Objects.equals(lotteryTicketId, serialTicketId)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
    }

    public void reserveForDraft(LocalDateTime reservedAt, LocalDateTime expiresAt) {
        if (expiresAt == null || !isInventoryAvailable()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }
        status = AllocationSerialStatus.DRAFT_RESERVED;
        this.reservedAt = reservedAt;
        reservedExpiresAt = expiresAt;
        luckyOverride = lucky;
        soldAt = null;
    }

    /** @deprecated Application commands must provide their single command timestamp. */
    @Deprecated
    public void reserveForDraft(LocalDateTime expiresAt) {
        reserveForDraft(LocalDateTime.now(), expiresAt);
    }

    public void markReservedByBatch(Long batchId) {
        allocationBatchId = batchId;
        ticketStatus = LotteryTicketSerialStatus.RESERVED;
    }

    public void handOver() {
        if (status != AllocationSerialStatus.DRAFT_RESERVED) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        ticketStatus = LotteryTicketSerialStatus.WITH_STREET_AGENT;
        status = AllocationSerialStatus.HANDED_OVER;
        reservedExpiresAt = null;
    }

    public void releaseDraftReservation() {
        releaseDraftReservation(false);
    }

    public void releaseDraftReservation(boolean expireAfterRelease) {
        if (status != AllocationSerialStatus.DRAFT_RESERVED) {
            return;
        }
        if (expireAfterRelease) {
            ticketStatus = LotteryTicketSerialStatus.EXPIRED;
        } else {
            ticketStatus = LotteryTicketSerialStatus.IN_STOCK;
        }
        status = AllocationSerialStatus.RELEASED;
        reservedExpiresAt = null;
        allocationBatchId = null;
    }

    public void stageStreetAgentReturn() {
        if (status != AllocationSerialStatus.HANDED_OVER || ticketStatus != LotteryTicketSerialStatus.WITH_STREET_AGENT) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);
        }
        status = AllocationSerialStatus.RETURN_PENDING_INSPECTION;
    }

    /** Undo a staged physical return before its receipt has been finalized. */
    public void removeFromStreetAgentReturnInspection() {
        if (status != AllocationSerialStatus.RETURN_PENDING_INSPECTION
                || ticketStatus != LotteryTicketSerialStatus.WITH_STREET_AGENT) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);
        }
        status = AllocationSerialStatus.HANDED_OVER;
        vendorReturnBatchLineId = null;
        returnRejectionReason = null;
        returnedAt = null;
    }

    public void returnFromStreetAgent(LocalDateTime returnedAt) {
        if (status != AllocationSerialStatus.RETURN_PENDING_INSPECTION
                || ticketStatus != LotteryTicketSerialStatus.WITH_STREET_AGENT) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);
        }
        status = AllocationSerialStatus.RETURNED;
        reservedExpiresAt = null;
        this.returnedAt = returnedAt;
    }

    public void rejectStreetAgentReturn(String reason) {
        if (status != AllocationSerialStatus.RETURN_PENDING_INSPECTION
                || ticketStatus != LotteryTicketSerialStatus.WITH_STREET_AGENT) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_SERIAL_INVALID);
        }
        status = AllocationSerialStatus.RETURN_REJECTED;
        returnRejectionReason = reason;
    }

    public void restoreAcceptedReturnToStock(boolean sellable) {
        if (status != AllocationSerialStatus.RETURNED) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        ticketStatus = sellable ? LotteryTicketSerialStatus.IN_STOCK : LotteryTicketSerialStatus.EXPIRED;
        reservedExpiresAt = null;
    }

    public void markSoldAtSettlement(LocalDateTime soldAt) {
        if ((status != AllocationSerialStatus.HANDED_OVER && status != AllocationSerialStatus.RETURN_REJECTED)
                || ticketStatus != LotteryTicketSerialStatus.WITH_STREET_AGENT) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_INVALID_STATE);
        }
        status = AllocationSerialStatus.SOLD;
        ticketStatus = LotteryTicketSerialStatus.SOLD;
        reservedExpiresAt = null;
        this.soldAt = soldAt;
    }

    /** @deprecated Application commands must provide their single command timestamp. */
    @Deprecated
    public void markSoldAtSettlement() {
        markSoldAtSettlement(LocalDateTime.now());
    }
}
