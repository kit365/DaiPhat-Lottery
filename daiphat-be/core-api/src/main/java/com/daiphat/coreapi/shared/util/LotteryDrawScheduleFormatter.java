package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;

import java.time.DayOfWeek;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

/**
 * A station's weekly draw schedule as a reader recognises it: "Thứ 2, Thứ 6 · 16:15".
 *
 * <p>Printed beside every station on a delivery note, because the schedule is what
 * tells someone checking the paperwork whether a station belongs on that draw date
 * at all - a line for a station that does not draw that day is a data entry error,
 * and only the schedule makes it visible.
 */
public final class LotteryDrawScheduleFormatter {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private LotteryDrawScheduleFormatter() {
    }

    public static String describe(LotteryStationModel station) {
        if (station == null) {
            return "";
        }

        String days = station.getDrawDays() == null || station.getDrawDays().isEmpty()
                ? ""
                : station.getDrawDays().stream()
                        .map(LotteryDrawScheduleFormatter::vietnameseDay)
                        .collect(Collectors.joining(", "));
        String time = station.getDrawTime() == null ? "" : station.getDrawTime().format(TIME);

        if (days.isEmpty()) {
            return time;
        }
        return time.isEmpty() ? days : days + " · " + time;
    }

    /** "Thứ 2" — the weekday as a Vietnamese reader names it. */
    public static String dayLabel(DayOfWeek day) {
        return day == null ? "" : vietnameseDay(day);
    }

    /** "Thứ 2, Thứ 6" — a list of weekdays, in week order. */
    public static String dayLabels(java.util.Collection<DayOfWeek> days) {
        if (days == null || days.isEmpty()) {
            return "";
        }
        return days.stream()
                .sorted()
                .map(LotteryDrawScheduleFormatter::vietnameseDay)
                .collect(Collectors.joining(", "));
    }

    private static String vietnameseDay(DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "Thứ 2";
            case TUESDAY -> "Thứ 3";
            case WEDNESDAY -> "Thứ 4";
            case THURSDAY -> "Thứ 5";
            case FRIDAY -> "Thứ 6";
            case SATURDAY -> "Thứ 7";
            case SUNDAY -> "Chủ nhật";
        };
    }
}
