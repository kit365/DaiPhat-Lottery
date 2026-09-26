package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import lombok.*;

import java.math.BigDecimal;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryTicketModel {

    public static final String ALL_SERIALS_FAULTY_STATUS_REASON =
            "Dãy vé không còn hiệu lực: tất cả sê-ri vật lý đã được báo hỏng hoặc thất lạc.";
    public static final String ALL_SERIALS_FAULTY_REASON_PREFIX = "Dãy vé đã hủy: ";
    private static final int STATUS_REASON_MAX_LENGTH = 500;

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

        LocalDate today = DrawScheduleUtils.today();
        if (this.drawDate.isBefore(today)) {
            return true;
        }
        return cutoffTime != null
                && this.drawDate.isEqual(today)
                && !DrawScheduleUtils.nowTime().isBefore(cutoffTime);
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
        syncAggregateState(availableSerialCount, totalSerialCount, soldSerialCount, faultySerialCount, cutoffTime, null);
    }

    /**
     * @param allFaultyReason cancel reason stored in {@code statusReason} when every visible serial
     *                        is faulty; falls back to {@link #ALL_SERIALS_FAULTY_STATUS_REASON} when blank.
     */
    public void syncAggregateState(
            int availableSerialCount,
            int totalSerialCount,
            int soldSerialCount,
            int faultySerialCount,
            LocalTime cutoffTime,
            String allFaultyReason
    ) {
        // Display quantity = every non-deleted, non-VOIDED serial linked to this lottery number.
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
            this.statusReason = allFaultyReason != null && !allFaultyReason.isBlank()
                    ? allFaultyReason
                    : ALL_SERIALS_FAULTY_STATUS_REASON;
        } else if (isSystemCancelReason(this.statusReason)) {
            this.statusReason = null;
        }
    }

    /**
     * Builds the ticket cancel reason from the serials' incident reasons, grouped by condition and reason.
     * Returns {@code null} when no serial is given.
     */
    public static String buildAllSerialsFaultyReason(List<LotteryTicketSerialModel> faultySerials) {
        if (faultySerials == null || faultySerials.isEmpty()) {
            return null;
        }
        Map<String, Integer> groups = new LinkedHashMap<>();
        for (LotteryTicketSerialModel serial : faultySerials) {
            String condition = serial.getTicketCondition() != null
                    ? serial.getTicketCondition().getDisplayName()
                    : "Sự cố";
            String reason = serial.getDamagedReason() != null ? serial.getDamagedReason().trim() : "";
            String key = reason.isEmpty() ? condition : condition + ": " + reason;
            groups.merge(key, 1, Integer::sum);
        }

        int total = faultySerials.size();
        String text;
        if (groups.size() == 1) {
            text = ALL_SERIALS_FAULTY_REASON_PREFIX + "toàn bộ " + total + " sê-ri được báo "
                    + groups.keySet().iterator().next() + ".";
        } else {
            String details = groups.entrySet().stream()
                    .map(entry -> entry.getKey() + " (" + entry.getValue() + " sê-ri)")
                    .collect(Collectors.joining("; "));
            text = ALL_SERIALS_FAULTY_REASON_PREFIX + "toàn bộ " + total + " sê-ri được báo sự cố - "
                    + details + ".";
        }
        return text.length() > STATUS_REASON_MAX_LENGTH
                ? text.substring(0, STATUS_REASON_MAX_LENGTH - 3) + "..."
                : text;
    }

    private static boolean isSystemCancelReason(String reason) {
        return reason != null
                && (ALL_SERIALS_FAULTY_STATUS_REASON.equals(reason)
                || reason.startsWith(ALL_SERIALS_FAULTY_REASON_PREFIX));
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
