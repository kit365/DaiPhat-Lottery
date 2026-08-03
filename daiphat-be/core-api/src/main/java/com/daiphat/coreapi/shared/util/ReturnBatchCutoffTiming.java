package com.daiphat.coreapi.shared.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

/**
 * Timing helpers for return-batch inspection window, urgent reminder, and cutoff expiry.
 */
public final class ReturnBatchCutoffTiming {

    private ReturnBatchCutoffTiming() {
    }

    public static LocalDateTime cutoffAt(LocalDate drawDate, LocalTime returnCutOffTime) {
        if (drawDate == null || returnCutOffTime == null) {
            return null;
        }
        return LocalDateTime.of(drawDate, returnCutOffTime);
    }

    public static LocalDateTime inspectionWindowStartAt(
            LocalDate drawDate,
            LocalTime returnCutOffTime,
            int bufferMinutes
    ) {
        LocalDateTime cutoff = cutoffAt(drawDate, returnCutOffTime);
        if (cutoff == null) {
            return null;
        }
        return cutoff.minusMinutes(Math.max(0, bufferMinutes));
    }

    public static LocalDateTime reminderTriggerAt(
            LocalDate drawDate,
            LocalTime returnCutOffTime,
            int reminderMinutes
    ) {
        LocalDateTime cutoff = cutoffAt(drawDate, returnCutOffTime);
        if (cutoff == null) {
            return null;
        }
        return cutoff.minusMinutes(Math.max(0, reminderMinutes));
    }

    /** {@code true} when {@code now >= returnCutOffTime} on the draw date. */
    public static boolean isPastCutoff(
            LocalDate drawDate,
            LocalTime returnCutOffTime,
            LocalDateTime now
    ) {
        LocalDateTime cutoff = cutoffAt(drawDate, returnCutOffTime);
        if (cutoff == null || now == null) {
            return false;
        }
        return !now.isBefore(cutoff);
    }

    public static boolean isInInspectionWindow(
            LocalDate drawDate,
            LocalTime returnCutOffTime,
            LocalDateTime now,
            int bufferMinutes
    ) {
        LocalDateTime windowStart = inspectionWindowStartAt(drawDate, returnCutOffTime, bufferMinutes);
        LocalDateTime cutoff = cutoffAt(drawDate, returnCutOffTime);
        if (windowStart == null || cutoff == null || now == null) {
            return false;
        }
        return !now.isBefore(windowStart) && now.isBefore(cutoff);
    }

    public static boolean isInUrgentReminderWindow(
            LocalDate drawDate,
            LocalTime returnCutOffTime,
            LocalDateTime now,
            int reminderMinutes
    ) {
        LocalDateTime trigger = reminderTriggerAt(drawDate, returnCutOffTime, reminderMinutes);
        LocalDateTime cutoff = cutoffAt(drawDate, returnCutOffTime);
        if (trigger == null || cutoff == null || now == null) {
            return false;
        }
        return !now.isBefore(trigger) && now.isBefore(cutoff);
    }

    /** Whole minutes remaining until cutoff; {@code null} if unknown; {@code 0} if past. */
    public static Long minutesUntilCutoff(
            LocalDate drawDate,
            LocalTime returnCutOffTime,
            LocalDateTime now
    ) {
        LocalDateTime cutoff = cutoffAt(drawDate, returnCutOffTime);
        if (cutoff == null || now == null) {
            return null;
        }
        if (!now.isBefore(cutoff)) {
            return 0L;
        }
        return ChronoUnit.MINUTES.between(now, cutoff);
    }
}
