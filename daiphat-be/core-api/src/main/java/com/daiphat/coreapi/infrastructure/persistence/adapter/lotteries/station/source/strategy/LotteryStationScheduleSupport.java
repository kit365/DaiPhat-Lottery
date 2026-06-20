package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class LotteryStationScheduleSupport {

    private LotteryStationScheduleSupport() {
    }

    public static String toDayOfWeekName(String dayLabel) {
        return switch (dayLabel.toLowerCase(Locale.ROOT)) {
            case "thứ 2" -> "MONDAY";
            case "thứ 3" -> "TUESDAY";
            case "thứ 4" -> "WEDNESDAY";
            case "thứ 5" -> "THURSDAY";
            case "thứ 6" -> "FRIDAY";
            case "thứ 7" -> "SATURDAY";
            case "chủ nhật" -> "SUNDAY";
            default -> dayLabel.toUpperCase(Locale.ROOT);
        };
    }

    public static Map<String, List<String>> toOrderedListMap(Map<String, LinkedHashSet<String>> drawDaysByStation) {
        Map<String, List<String>> result = new LinkedHashMap<>();
        for (Map.Entry<String, LinkedHashSet<String>> entry : drawDaysByStation.entrySet()) {
            result.put(entry.getKey(), new ArrayList<>(entry.getValue()));
        }
        return result;
    }

    public static String normalizeRegion(String region) {
        return LotteryRegionCode.normalize(region);
    }

    public static String regionLabel(String region) {
        return switch (LotteryRegionCode.valueOf(normalizeRegion(region))) {
            case MIEN_TRUNG -> "Miền Trung";
            case MIEN_BAC -> "Miền Bắc";
            case MIEN_NAM -> "Miền Nam";
        };
    }
}
