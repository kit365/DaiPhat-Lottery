package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryTicketModel {

    private static final LocalTime CUTOFF_TIME = LocalTime.of(15, 0);

    private Long id;
    private Long productId;
    private String ticketImg;
    private String serialNumber;
    private String numbers;
    private LocalDate drawDate;
    private String batchCode;

    @Builder.Default
    private LotteryTicketStatus status = LotteryTicketStatus.IN_STOCK;

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
        ensureBookable();
        this.status = LotteryTicketStatus.RESERVED;
    }

    public void sellOnline() {
        ensureStatusIn(
                LotteryTicketStatus.IN_STOCK,
                LotteryTicketStatus.RESERVED);
        ensureBookable();
        this.status = LotteryTicketStatus.SOLD;
    }

    public void sellOffline() {
        ensureStatus(LotteryTicketStatus.IN_STOCK);
        ensureBookable();
        this.status = LotteryTicketStatus.SOLD;
    }

    public void holdForProxy() {
        ensureStatus(LotteryTicketStatus.IN_STOCK);
        this.status = LotteryTicketStatus.PROXY_HOLDING;
    }

    public void requestReturn() {
        ensureStatusIn(
                LotteryTicketStatus.IN_STOCK,
                LotteryTicketStatus.RESERVED,
                LotteryTicketStatus.PROXY_HOLDING);
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
        if (isSold()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        this.status = LotteryTicketStatus.INTERNAL_FAULT;
    }

    public void markIssuerFault() {
        if (isSold()) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        this.status = LotteryTicketStatus.ISSUER_FAULT;
    }

    public void expire() {
        ensureStatusIn(
                LotteryTicketStatus.IN_STOCK,
                LotteryTicketStatus.RESERVED,
                LotteryTicketStatus.PROXY_HOLDING);
        this.status = LotteryTicketStatus.EXPIRED;
    }

    public boolean countsTowardInventory() {
        return this.status == LotteryTicketStatus.IN_STOCK
                || this.status == LotteryTicketStatus.RESERVED
                || this.status == LotteryTicketStatus.PROXY_HOLDING;
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

    private boolean isSold() {
        return this.status == LotteryTicketStatus.SOLD;
    }

    private void ensureBookable() {
        if (this.drawDate == null) {
            return;
        }

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        if (this.drawDate.isBefore(today)) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_EXPIRED,
                    "Ve so da qua ngay quay, khong the dat mua hoac giu cho."
            );
        }

        if (this.drawDate.isEqual(today) && now.isAfter(CUTOFF_TIME)) {
            throw new DomainException(
                    ErrorCode.LOTTERY_TICKET_BOOKING_CLOSED,
                    "Ve so da qua gio chot dat cua hom nay, khong the dat mua hoac giu cho."
            );
        }
    }
}
