package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDate;
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

    /**
     * True once the station draw moment has passed (inclusive at {@code drawTime}).
     * Same boundary as {@code filterPublic}: sellable only while {@code drawTime > now}.
     */
    public static boolean isPastDraw(LocalDate drawDate, LocalTime drawTime) {
        if (drawDate == null) {
            return true;
        }
        LocalDate today = DrawScheduleUtils.today();
        if (drawDate.isBefore(today)) {
            return true;
        }
        if (drawDate.isAfter(today)) {
            return false;
        }
        if (drawTime == null) {
            return false;
        }
        return !DrawScheduleUtils.nowTime().isBefore(drawTime);
    }

    public static boolean isScheduledDrawDay(LocalDate drawDate, List<DayOfWeek> drawDays) {
        if (drawDate == null) {
            return false;
        }
        if (drawDays == null || drawDays.isEmpty()) {
            return true;
        }
        return drawDays.contains(drawDate.getDayOfWeek());
    }

    public static boolean isSellableForVendor(VendorAllocationSerialModel serial, LocalDate businessDate) {
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
        return !isPastDraw(serial.getDrawDate(), serial.getDrawTime());
    }

    public static String resolveBlockedReason(
            LocalDate businessDate,
            int remainingDailyCap,
            List<VendorAllocationSerialModel> rawInventory
    ) {
        LocalDate today = DrawScheduleUtils.today();
        if (businessDate.isBefore(today)) {
            return BLOCKED_DRAW_TIME_PASSED;
        }
        if (remainingDailyCap <= 0) {
            return BLOCKED_DAILY_CAP_EXHAUSTED;
        }
        if (rawInventory == null || rawInventory.isEmpty()) {
            return BLOCKED_NO_ELIGIBLE_INVENTORY;
        }
        boolean anyScheduled = rawInventory.stream()
                .anyMatch(serial -> isScheduledDrawDay(serial.getDrawDate(), serial.getDrawDays()));
        if (!anyScheduled) {
            return BLOCKED_DATE_NOT_SCHEDULED;
        }
        boolean anyNotPastDraw = rawInventory.stream()
                .anyMatch(serial -> !isPastDraw(serial.getDrawDate(), serial.getDrawTime()));
        if (!anyNotPastDraw) {
            return BLOCKED_DRAW_TIME_PASSED;
        }
        return BLOCKED_NO_ELIGIBLE_INVENTORY;
    }
}
