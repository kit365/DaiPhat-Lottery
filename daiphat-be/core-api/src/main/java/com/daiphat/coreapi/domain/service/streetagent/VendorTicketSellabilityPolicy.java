package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Vendor allocation sellability — mirrors public browse ({@code LotteryTicketSpecification.filterPublic})
 * and domain expiry ({@code LotteryTicketModel#isExpired}) using Vietnam local time.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorTicketSellabilityPolicy {

    public static final String BLOCKED_DRAW_TIME_PASSED = "DRAW_TIME_PASSED";
    public static final String BLOCKED_DATE_NOT_SCHEDULED = "DATE_NOT_SCHEDULED";
    public static final String BLOCKED_NO_ELIGIBLE_INVENTORY = "NO_ELIGIBLE_INVENTORY";
    public static final String BLOCKED_DAILY_CAP_EXHAUSTED = "DAILY_CAP_EXHAUSTED";
    /** The configured same-day handover/return cut-off has passed. */
    public static final String BLOCKED_RETURN_CUTOFF_REACHED = "RETURN_CUTOFF_REACHED";
    public static final String BLOCKED_BUSINESS_DATE_PASSED = "BUSINESS_DATE_PASSED";
    public static final String BLOCKED_OPERATIONAL_DEADLINE_REACHED = "OPERATIONAL_DEADLINE_REACHED";
    public static final String BLOCKED_SUPPLIER_RETURN_CUTOFF_MISSING = "SUPPLIER_RETURN_CUTOFF_MISSING";
    public static final String BLOCKED_DRAW_SCHEDULE_MISSING = "DRAW_SCHEDULE_MISSING";

    /**
     * True once the station draw moment has passed (inclusive at {@code drawTime}).
     * Same boundary as {@code filterPublic}: sellable only while {@code drawTime > now}.
     */
    public static boolean isPastDraw(LocalDate drawDate, LocalTime drawTime) {
        return isPastDraw(drawDate, drawTime, LocalDateTime.now(DrawScheduleUtils.VIETNAM_ZONE));
    }

    /** Deterministic command-time variant. Use this for all allocation decisions. */
    public static boolean isPastDraw(LocalDate drawDate, LocalTime drawTime, LocalDateTime at) {
        if (drawDate == null) {
            return true;
        }
        if (at == null) {
            return true;
        }
        LocalDate today = at.toLocalDate();
        if (drawDate.isBefore(today)) {
            return true;
        }
        if (drawDate.isAfter(today)) {
            return false;
        }
        if (drawTime == null) {
            return true;
        }
        return !at.toLocalTime().isBefore(drawTime);
    }

    public static boolean isScheduledDrawDay(LocalDate drawDate, List<DayOfWeek> drawDays) {
        if (drawDate == null) {
            return false;
        }
        if (drawDays == null || drawDays.isEmpty()) {
            return false;
        }
        return drawDays.contains(drawDate.getDayOfWeek());
    }

    public static boolean isSellableForVendor(VendorAllocationSerialModel serial, LocalDate businessDate) {
        return isSellableForVendor(serial, businessDate, LocalDateTime.now(DrawScheduleUtils.VIETNAM_ZONE));
    }

    /** Deterministic command-time variant. A missing draw schedule is never sellable. */
    public static boolean isSellableForVendor(
            VendorAllocationSerialModel serial, LocalDate businessDate, LocalDateTime at) {
        if (serial == null || businessDate == null || !businessDate.equals(serial.getDrawDate())) {
            return false;
        }
        if (!serial.isInventoryAvailable()) {
            return false;
        }
        if (!serial.isStationActive() || !serial.isTicketActive()) {
            return false;
        }
        if (serial.getTicketAggregateStatus() == LotteryTicketStatus.EXPIRED) {
            return false;
        }
        if (!isScheduledDrawDay(serial.getDrawDate(), serial.getDrawDays())) {
            return false;
        }
        return !isPastDraw(serial.getDrawDate(), serial.getDrawTime(), at);
    }

    public static String resolveBlockedReason(
            LocalDate businessDate,
            int remainingDailyCap,
            List<VendorAllocationSerialModel> rawInventory
    ) {
        return resolveBlockedReason(businessDate, remainingDailyCap, rawInventory,
                LocalDateTime.now(DrawScheduleUtils.VIETNAM_ZONE));
    }

    public static String resolveBlockedReason(
            LocalDate businessDate,
            int remainingDailyCap,
            List<VendorAllocationSerialModel> rawInventory,
            LocalDateTime at
    ) {
        LocalDate today = at == null ? null : at.toLocalDate();
        if (businessDate == null || today == null || businessDate.isBefore(today)) {
            return BLOCKED_DRAW_TIME_PASSED;
        }
        if (rawInventory == null || rawInventory.isEmpty()) {
            return BLOCKED_NO_ELIGIBLE_INVENTORY;
        }
        boolean anyScheduled = rawInventory.stream()
                .anyMatch(serial -> isScheduledDrawDay(serial.getDrawDate(), serial.getDrawDays()));
        if (!anyScheduled) {
            boolean anyMissingSchedule = rawInventory.stream().anyMatch(serial -> serial.getDrawTime() == null
                    || serial.getDrawDays() == null || serial.getDrawDays().isEmpty());
            return anyMissingSchedule ? BLOCKED_DRAW_SCHEDULE_MISSING : BLOCKED_DATE_NOT_SCHEDULED;
        }
        boolean anyNotPastDraw = rawInventory.stream()
                .anyMatch(serial -> !isPastDraw(serial.getDrawDate(), serial.getDrawTime(), at));
        if (!anyNotPastDraw) {
            return BLOCKED_DRAW_TIME_PASSED;
        }
        // Explain the physical/business availability first. A zero cap can be
        // caused by an unconfigured/new profile, but must not hide the fact
        // that there are no eligible tickets to hand over.
        if (remainingDailyCap <= 0) {
            return BLOCKED_DAILY_CAP_EXHAUSTED;
        }
        return BLOCKED_NO_ELIGIBLE_INVENTORY;
    }
}
