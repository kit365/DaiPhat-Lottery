package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy.minhngoc;

import org.jsoup.nodes.Document;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class MinhNgocFallbackScheduleParser {

    private static final String SOUTHERN_REGION = "MIEN_NAM";
    private static final String CENTRAL_REGION = "MIEN_TRUNG";
    private static final String NORTHERN_REGION = "MIEN_BAC";

    private final MinhNgocStationNameNormalizer normalizer;

    MinhNgocFallbackScheduleParser(MinhNgocStationNameNormalizer normalizer) {
        this.normalizer = normalizer;
    }

    Map<String, List<String>> parse(Document scheduleDocument, String region) {
        if (scheduleDocument == null) {
            return Map.of();
        }

        Map<String, LinkedHashSet<String>> drawDaysByStation = new LinkedHashMap<>();
        Matcher matcher = schedulePatternFor(region).matcher(scheduleDocument.text());
        while (matcher.find()) {
            String day = toDayOfWeekName(matcher.group(1));
            String canonicalName = normalizer.toCanonicalName(matcher.group(2).trim());
            String key = normalizer.normalizeKey(canonicalName);
            drawDaysByStation.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(day);
        }

        Map<String, List<String>> result = new LinkedHashMap<>();
        for (Map.Entry<String, LinkedHashSet<String>> entry : drawDaysByStation.entrySet()) {
            result.put(entry.getKey(), new ArrayList<>(entry.getValue()));
        }
        return result;
    }

    private String toDayOfWeekName(String dayLabel) {
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

    private Pattern schedulePatternFor(String region) {
        String regionLabel = switch (normalizeRegion(region)) {
            case CENTRAL_REGION -> "Miền Trung";
            case NORTHERN_REGION -> "Miền Bắc";
            default -> "Miền Nam";
        };
        return Pattern.compile(
                "(Chủ nhật|Thứ 2|Thứ 3|Thứ 4|Thứ 5|Thứ 6|Thứ 7)\\s+"
                        + regionLabel
                        + "\\s+([\\p{L}0-9.\\s]+?)(?=(?:Chủ nhật|Thứ 2|Thứ 3|Thứ 4|Thứ 5|Thứ 6|Thứ 7)\\s+Miền\\s+(?:Bắc|Nam|Trung)|Advertisements|###|$)"
        );
    }

    private String normalizeRegion(String region) {
        return region == null ? SOUTHERN_REGION : region.trim().toUpperCase(Locale.ROOT);
    }
}
