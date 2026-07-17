package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

public final class DrawScheduleUtils {

    /**
     * All draw schedules follow Vietnam local time regardless of server timezone.
     */
    public static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private DrawScheduleUtils() {
    }

    public static LocalDate today() {
        return LocalDate.now(VIETNAM_ZONE);
    }

    public static LocalTime nowTime() {
        return LocalTime.now(VIETNAM_ZONE);
    }

    /**
     * Resolves the next sellable draw date. Once the draw time has passed on a draw day,
     * tickets for that day are no longer on sale, so the next occurrence is returned instead
     * (e.g. right after the 16:15 draw on Saturday, a Saturday-only station resolves to next Saturday).
     */
    public static LocalDate resolveNextDrawDate(List<DayOfWeek> drawDays, LocalTime drawTime) {
        validate(drawDays, drawTime);

        LocalDate today = today();
        boolean todayDrawPassed = !nowTime().isBefore(drawTime);

        for (int i = 0; i <= 7; i++) {
            if (i == 0 && todayDrawPassed) {
                continue;
            }
            LocalDate candidate = today.plusDays(i);
            if (drawDays.contains(candidate.getDayOfWeek())) {
                return candidate;
            }
        }

        throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE);
    }

    public static void validate(List<DayOfWeek> drawDays, LocalTime drawTime) {
        if (drawDays == null || drawDays.isEmpty() || drawTime == null) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE);
        }
    }
}
