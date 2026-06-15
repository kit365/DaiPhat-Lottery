package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryTicketModel {

    private Long id;
    private Long stationId;
    private String ticketImg;
    private BigDecimal priceSnapshot;
    private String numbers;
    private LocalDate drawDate;
    private String batchCode;
    @Builder.Default
    private Integer quantity = 1;

    @Builder.Default
    private LotteryTicketStatus status = LotteryTicketStatus.IN_STOCK;

    @Builder.Default
    private List<LotteryTicketSerialModel> serials = new ArrayList<>();

    private UUID importedById;
    private LocalDateTime importedAt;

    @Builder.Default
    private boolean verified = false;

    private UUID verifiedById;
    private LocalDateTime verifiedAt;
    private LocalDateTime returnedAt;

    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeImport(UUID importedById) {
        this.importedById = importedById;
        this.importedAt = LocalDateTime.now();
        this.status = LotteryTicketStatus.IN_STOCK;
        this.verified = false;
        this.verifiedById = null;
        this.verifiedAt = null;
        this.returnedAt = null;
    }

    public void reserve() {
        ensureStatus(LotteryTicketStatus.IN_STOCK);
        this.status = LotteryTicketStatus.RESERVED;
    }

    public void releaseReservation() {
        ensureStatus(LotteryTicketStatus.RESERVED);
        this.status = LotteryTicketStatus.IN_STOCK;
    }

    public void sellOnline() {
        ensureStatusIn(LotteryTicketStatus.IN_STOCK, LotteryTicketStatus.RESERVED, LotteryTicketStatus.SOLD_OUT);
        this.status = LotteryTicketStatus.SOLD;
    }

    public void sellOffline() {
        ensureStatusIn(LotteryTicketStatus.IN_STOCK, LotteryTicketStatus.RESERVED, LotteryTicketStatus.SOLD_OUT);
        this.status = LotteryTicketStatus.SOLD;
    }

    public void holdForProxy() {
        ensureStatusIn(LotteryTicketStatus.IN_STOCK, LotteryTicketStatus.SOLD_OUT);
        this.status = LotteryTicketStatus.PROXY_HOLDING;
    }

    public void requestReturn() {
        ensureStatusIn(LotteryTicketStatus.SOLD, LotteryTicketStatus.PROXY_HOLDING);
        this.status = LotteryTicketStatus.PENDING_RETURN;
    }

    public void confirmReturned() {
        ensureStatus(LotteryTicketStatus.PENDING_RETURN);
        this.status = LotteryTicketStatus.RETURNED;
        this.returnedAt = LocalDateTime.now();
    }

    public void verify(UUID verifierId) {
        if (this.verified) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_ALREADY_VERIFIED);
        }
        this.verified = true;
        this.verifiedById = verifierId;
        this.verifiedAt = LocalDateTime.now();
    }

    public void markInternalFault() {
        ensureStatusIn(
                LotteryTicketStatus.IN_STOCK,
                LotteryTicketStatus.RESERVED,
                LotteryTicketStatus.SOLD_OUT,
                LotteryTicketStatus.PROXY_HOLDING
        );
        this.status = LotteryTicketStatus.INTERNAL_FAULT;
    }

    public void markIssuerFault() {
        ensureStatusIn(
                LotteryTicketStatus.IN_STOCK,
                LotteryTicketStatus.RESERVED,
                LotteryTicketStatus.SOLD_OUT,
                LotteryTicketStatus.PROXY_HOLDING
        );
        this.status = LotteryTicketStatus.ISSUER_FAULT;
    }

    public void expire() {
        this.status = LotteryTicketStatus.EXPIRED;
    }

    public boolean isExpired(LocalTime cutoffTime) {
        if (this.drawDate == null) {
            return false;
        }

        LocalDate today = LocalDate.now();
        if (this.drawDate.isBefore(today)) {
            return true;
        }
        return cutoffTime != null
                && this.drawDate.isEqual(today)
                && LocalTime.now().isAfter(cutoffTime);
    }

    public LotteryTicketStatus resolveAggregateStatus(long availableSerialCount, LocalTime cutoffTime) {
        if (isExpired(cutoffTime)) {
            return LotteryTicketStatus.EXPIRED;
        }
        return availableSerialCount > 0 ? LotteryTicketStatus.IN_STOCK : LotteryTicketStatus.SOLD_OUT;
    }

    public void syncAggregateState(int availableSerialCount, LocalTime cutoffTime) {
        this.quantity = availableSerialCount;
        if (!isWorkflowManagedStatus()) {
            this.status = resolveAggregateStatus(availableSerialCount, cutoffTime);
        }
    }

    private boolean isWorkflowManagedStatus() {
        return switch (this.status) {
            case RESERVED, SOLD, PROXY_HOLDING, PENDING_RETURN, RETURNED, INTERNAL_FAULT, ISSUER_FAULT -> true;
            default -> false;
        };
    }

    public void validateDrawDate(LocalDate drawDate) {
        if (drawDate == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_DRAW_DATE_REQUIRED);
        }

        LocalDate today = LocalDate.now();
        if (drawDate.isBefore(today)) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_DRAW_DATE_INVALID);
        }
    }

    public boolean countsTowardInventory() {
        return this.status == LotteryTicketStatus.IN_STOCK;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return this.deletedAt != null;
    }

    private void ensureStatus(LotteryTicketStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
    }

    private void ensureStatusIn(LotteryTicketStatus... allowedStatuses) {
        for (LotteryTicketStatus allowedStatus : allowedStatuses) {
            if (this.status == allowedStatus) {
                return;
            }
        }
        throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }
}
