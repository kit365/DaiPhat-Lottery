package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
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

    public static ZonedDateTime nowVn() {
        return ZonedDateTime.now(VIETNAM_ZONE);
    }

    /** Treat stored wall-clock timestamps as Asia/Ho_Chi_Minh and expose ISO offset. */
    public static OffsetDateTime toVietnamOffset(LocalDateTime local) {
        if (local == null) {
            return null;
        }
        return local.atZone(VIETNAM_ZONE).toOffsetDateTime();
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

    /**
     * Default public sellable draw date for "today" / blank home queries.
     * After the southern draw cutoff (typically 16:15), rolls forward to tomorrow.
     */
    public static LocalDate resolveDefaultSellableDrawDate(LocalTime cutoff) {
        return resolveDefaultSellableDrawDate(today(), nowTime(), cutoff);
    }

    public static LocalDate resolveDefaultSellableDrawDate() {
        return resolveDefaultSellableDrawDate(LocalTime.of(16, 15));
    }

    /** Testable overload — inject clock parts instead of wall-clock Vietnam time. */
    public static LocalDate resolveDefaultSellableDrawDate(LocalDate today, LocalTime now, LocalTime cutoff) {
        LocalTime effectiveCutoff = cutoff != null ? cutoff : LocalTime.of(16, 15);
        LocalDate effectiveToday = today != null ? today : today();
        LocalTime effectiveNow = now != null ? now : nowTime();
        if (!effectiveNow.isBefore(effectiveCutoff)) {
            return effectiveToday.plusDays(1);
        }
        return effectiveToday;
    }

    /**
     * Resolves the most recent draw date that has already occurred (or today's draw after cutoff).
     */
    public static LocalDate resolveLastDrawDate(List<DayOfWeek> drawDays, LocalTime drawTime) {
        validate(drawDays, drawTime);

        LocalDate today = today();
        LocalTime now = nowTime();

        for (int i = 0; i <= 7; i++) {
            LocalDate candidate = today.minusDays(i);
            if (!drawDays.contains(candidate.getDayOfWeek())) {
                continue;
            }
            if (i == 0 && now.isBefore(drawTime)) {
                continue;
            }
            return candidate;
        }

        throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE);
    }

    public static void validate(List<DayOfWeek> drawDays, LocalTime drawTime) {
        if (drawDays == null || drawDays.isEmpty() || drawTime == null) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_INVALID_DRAW_SCHEDULE);
        }
    }
}
