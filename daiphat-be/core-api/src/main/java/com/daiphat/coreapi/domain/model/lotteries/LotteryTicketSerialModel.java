package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import lombok.*;

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
    private String ticketImg;
    private String serialNumber;

    @Builder.Default
    private LotteryTicketSerialStatus status = LotteryTicketSerialStatus.IN_STOCK;

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
    private String damagedEvidenceUrl;
    private String damagedReason;
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

    public void sellOnline() {
        if (this.status != LotteryTicketSerialStatus.IN_STOCK && this.status != LotteryTicketSerialStatus.RESERVED) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        this.status = LotteryTicketSerialStatus.SOLD;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
    }

    public void sellOffline() {
        ensureStatus(LotteryTicketSerialStatus.IN_STOCK);
        this.status = LotteryTicketSerialStatus.SOLD;
    }

    public void expire() {
        if (this.status != LotteryTicketSerialStatus.IN_STOCK
                && this.status != LotteryTicketSerialStatus.RESERVED) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
        this.status = LotteryTicketSerialStatus.EXPIRED;
        this.reservedAt = null;
        this.reservationExpiresAt = null;
        this.reservedByOrderId = null;
    }

    private void ensureStatus(LotteryTicketSerialStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
        }
    }
}
