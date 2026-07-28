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

    public static final String ALL_SERIALS_FAULTY_STATUS_REASON =
            "Dãy vé không còn hiệu lực: tất cả sê-ri vật lý đã được báo hỏng hoặc thất lạc.";

    private Long id;
    private Long stationId;
    private String ticketImg;
    private BigDecimal priceSnapshot;
    private String numbers;
    private LocalDate drawDate;
    @Builder.Default
    private Integer quantity = 1;

    @Builder.Default
    private LotteryTicketStatus status = LotteryTicketStatus.IN_STOCK;

    @Builder.Default
    private Boolean active = true;

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

    private String statusReason;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;



    public void verify(UUID verifierId) {
        if (this.verified) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_ALREADY_VERIFIED);
        }
        this.verified = true;
        this.verifiedById = verifierId;
        this.verifiedAt = LocalDateTime.now();
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


    public LotteryTicketStatus resolveAggregateStatus(
            long availableSerialCount,
            long totalSerialCount,
            long soldSerialCount,
            long faultySerialCount,
            LocalTime cutoffTime
    ) {
        if (isExpired(cutoffTime)) {
            return LotteryTicketStatus.EXPIRED;
        }
        if (availableSerialCount > 0) {
            return LotteryTicketStatus.IN_STOCK;
        }
        if (totalSerialCount == 0) {
            return LotteryTicketStatus.IN_STOCK;
        }
        if (soldSerialCount > 0) {
            return LotteryTicketStatus.SOLD_OUT;
        }
        if (faultySerialCount == totalSerialCount) {
            // No salable unit remains and every serial was reported DAMAGED or LOST.
            return LotteryTicketStatus.SOLD_OUT;
        }
        return LotteryTicketStatus.IN_STOCK;
    }

    public void syncAggregateState(
            int availableSerialCount,
            int totalSerialCount,
            int soldSerialCount,
            int faultySerialCount,
            LocalTime cutoffTime
    ) {
        // Display quantity = every non-deleted serial linked to this lottery number.
        this.quantity = totalSerialCount;
        // IMPORTING belongs to the import-batch flow and cannot be derived from serials,
        // so only the draw cutoff is allowed to move a ticket out of it.
        if (this.status == LotteryTicketStatus.IMPORTING && !isExpired(cutoffTime)) {
            return;
        }
        LotteryTicketStatus resolvedStatus = resolveAggregateStatus(
                availableSerialCount,
                totalSerialCount,
                soldSerialCount,
                faultySerialCount,
                cutoffTime);
        this.status = resolvedStatus;

        if (faultySerialCount == totalSerialCount
                && totalSerialCount > 0
                && resolvedStatus == LotteryTicketStatus.SOLD_OUT) {
            this.statusReason = ALL_SERIALS_FAULTY_STATUS_REASON;
        } else if (ALL_SERIALS_FAULTY_STATUS_REASON.equals(this.statusReason)) {
            this.statusReason = null;
        }
    }

    public void validateDrawDate(LocalDate drawDate) {
        if (drawDate == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_DRAW_DATE_REQUIRED);
        }
    }



    public boolean isEditableStatus() {
        return this.status == LotteryTicketStatus.IN_STOCK
                || this.status == LotteryTicketStatus.IMPORTING;
    }

    public boolean isSoftDeletableStatus() {
        return this.status == LotteryTicketStatus.IN_STOCK
                || this.status == LotteryTicketStatus.IMPORTING
                || this.status == LotteryTicketStatus.EXPIRED;
    }

    /**
     * Cancels this lottery number by marking soft deletion timestamp.
     */
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return this.deletedAt != null;
    }
}
