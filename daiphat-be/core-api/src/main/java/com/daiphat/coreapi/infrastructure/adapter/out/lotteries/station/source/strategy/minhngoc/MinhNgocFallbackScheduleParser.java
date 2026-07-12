package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.station.source.strategy.minhngoc;

import com.daiphat.coreapi.infrastructure.adapter.out.lotteries.station.source.strategy.LotteryStationScheduleSupport;
import org.jsoup.nodes.Document;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class MinhNgocFallbackScheduleParser {

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
            String day = LotteryStationScheduleSupport.toDayOfWeekName(matcher.group(1));
            String canonicalName = normalizer.toCanonicalName(matcher.group(2).trim());
            String key = normalizer.normalizeKey(canonicalName);
            drawDaysByStation.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(day);
        }

        return LotteryStationScheduleSupport.toOrderedListMap(drawDaysByStation);
    }

    private Pattern schedulePatternFor(String region) {
        String regionLabel = LotteryStationScheduleSupport.regionLabel(region);
        return Pattern.compile(
                "(Chủ nhật|Thứ 2|Thứ 3|Thứ 4|Thứ 5|Thứ 6|Thứ 7)\\s+"
                        + regionLabel
                        + "\\s+([\\p{L}0-9.\\s]+?)(?=(?:Chủ nhật|Thứ 2|Thứ 3|Thứ 4|Thứ 5|Thứ 6|Thứ 7)\\s+Miền\\s+(?:Bắc|Nam|Trung)|Advertisements|###|$)"
        );
    }
}
