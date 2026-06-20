package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy.xosovn;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy.LotteryStationScheduleSupport;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class XosoVnScheduleParser {

    private static final Pattern DRAW_TIME_PATTERN = Pattern.compile("(XSMN|XSMT|XSMB)\\s+(\\d{2})h(\\d{2})'");

    private final XosoVnStationNameNormalizer normalizer;

    XosoVnScheduleParser(XosoVnStationNameNormalizer normalizer) {
        this.normalizer = normalizer;
    }

    String parseDrawTime(Document document, String region) {
        if (document == null) {
            return null;
        }

        Element todayBlock = document.selectFirst(".block-lottery-today");
        if (todayBlock == null) {
            return null;
        }

        Matcher matcher = DRAW_TIME_PATTERN.matcher(todayBlock.text());
        String expectedCode = regionCode(region);
        while (matcher.find()) {
            if (expectedCode.equals(matcher.group(1).toUpperCase(Locale.ROOT))) {
                return matcher.group(2) + ":" + matcher.group(3);
            }
        }
        return null;
    }

    Map<String, List<String>> parseDrawDays(Document scheduleDocument, String region) {
        if (scheduleDocument == null) {
            return Map.of();
        }

        Map<String, LinkedHashSet<String>> drawDaysByStation = new LinkedHashMap<>();
        Matcher matcher = schedulePatternFor(region).matcher(scheduleDocument.text());
        while (matcher.find()) {
            String day = LotteryStationScheduleSupport.toDayOfWeekName(matcher.group(1));
            String canonicalName = normalizer.toCanonicalName(matcher.group(2).trim());
            String key = normalizer.normalizeKey(canonicalName);
            drawDaysByStation.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(day);
        }

        return LotteryStationScheduleSupport.toOrderedListMap(drawDaysByStation);
    }

    private String regionCode(String region) {
        return switch (LotteryRegionCode.valueOf(normalizeRegion(region))) {
            case MIEN_TRUNG -> "XSMT";
            case MIEN_BAC -> "XSMB";
            case MIEN_NAM -> "XSMN";
        };
    }

    private Pattern schedulePatternFor(String region) {
        String regionLabel = LotteryStationScheduleSupport.regionLabel(region);
        return Pattern.compile(
                "(Chủ nhật|Thứ 2|Thứ 3|Thứ 4|Thứ 5|Thứ 6|Thứ 7)\\s+"
                        + regionLabel
                        + "\\s+([\\p{L}0-9.\\s]+?)(?=(?:Chủ nhật|Thứ 2|Thứ 3|Thứ 4|Thứ 5|Thứ 6|Thứ 7)\\s+Miền\\s+(?:Bắc|Nam|Trung)|Advertisements|###|$)"
        );
    }

    private String normalizeRegion(String region) {
        return LotteryStationScheduleSupport.normalizeRegion(region);
    }
}
