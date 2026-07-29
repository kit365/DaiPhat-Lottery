package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

/**
 * Canonical default draw times per lottery region when DB value is unavailable.
 */
public final class LotteryRegionDrawScheduleDefaults {

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private LotteryRegionDrawScheduleDefaults() {
    }

    public static LocalTime fallbackForCode(String regionCode) {
        String normalized = LotteryRegionCode.normalize(regionCode);
        return switch (LotteryRegionCode.valueOf(normalized)) {
            case MIEN_TRUNG -> LocalTime.of(17, 15);
            case MIEN_BAC -> LocalTime.of(18, 15);
            case MIEN_NAM -> LocalTime.of(16, 15);
        };
    }

    public static String fallbackFormatted(String regionCode) {
        return formatTime(fallbackForCode(regionCode));
    }

    public static String formatTime(LocalTime time) {
        if (time == null) {
            return fallbackFormatted(LotteryRegionCode.MIEN_NAM.name());
        }
        return time.format(HH_MM);
    }
}
