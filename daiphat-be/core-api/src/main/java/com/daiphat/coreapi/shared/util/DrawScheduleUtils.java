package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;

public final class DrawScheduleUtils {

    private DrawScheduleUtils() {
    }

    public static LocalDate resolveNextDrawDate(List<DayOfWeek> drawDays, LocalTime drawTime) {
        validate(drawDays, drawTime);

        LocalDate today = LocalDate.now();

        List<DayOfWeek> sortedDays = drawDays.stream()
                .distinct()
                .sorted(Comparator.comparingInt(DayOfWeek::getValue))
                .toList();

        for (int i = 0; i < 7; i++) {
            LocalDate candidate = today.plusDays(i);
            if (!sortedDays.contains(candidate.getDayOfWeek())) {
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
