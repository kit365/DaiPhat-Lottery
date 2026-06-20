package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy.minhngoc;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy.LotteryStationScheduleSupport;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class MinhNgocScheduleParser {

    private static final String SOUTHERN_REGION = LotteryRegionCode.MIEN_NAM.name();
    private static final Pattern SOUTHERN_DRAW_TIME_PATTERN =
            Pattern.compile("Giờ xổ số\\s+(\\d{2})h(\\d{2})'->\\s*\\d{2}h\\d{2}'.*?Miền Bắc", Pattern.DOTALL);
    private static final Pattern STATION_IN_DAY_PATTERN =
            Pattern.compile("Xổ Số\\s+([\\p{L}.\\s]+?)(?=\\s+Xổ Số|$)");
    private static final Pattern HCM_SCHEDULE_FALLBACK_PATTERN = Pattern.compile(
            "(Thứ 2|Thứ 7)(.*?)(Xổ Số\\s+Tp\\.\\s*HCM)",
            Pattern.DOTALL
    );
    private static final List<String> SOUTHERN_DAY_LABELS = List.of(
            "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật", "Chủ nhật"
    );

    private final MinhNgocStationNameNormalizer normalizer;

    MinhNgocScheduleParser(MinhNgocStationNameNormalizer normalizer) {
        this.normalizer = normalizer;
    }

    Map<String, List<String>> parseDrawDays(Document scheduleDocument, String region) {
        if (scheduleDocument == null || !SOUTHERN_REGION.equals(normalizeRegion(region))) {
            return Map.of();
        }

        Map<String, LinkedHashSet<String>> drawDaysByStation = new LinkedHashMap<>();
        Elements rows = scheduleDocument.select("tr");
        for (Element row : rows) {
            Elements cells = row.select("td");
            if (cells.size() < 2) {
                continue;
            }

            String dayLabel = cells.getFirst().text().trim();
            if (!SOUTHERN_DAY_LABELS.contains(dayLabel)) {
                continue;
            }

            String normalizedDay = LotteryStationScheduleSupport.toDayOfWeekName(dayLabel);
            String southernCellText = cells.get(1).text().trim();
            if (southernCellText.isBlank()) {
                continue;
            }

            Matcher stationMatcher = STATION_IN_DAY_PATTERN.matcher(southernCellText);
            while (stationMatcher.find()) {
                String canonicalName = normalizer.toCanonicalName(stationMatcher.group(1));
                String normalizedKey = normalizer.normalizeKey(canonicalName);
                drawDaysByStation
                        .computeIfAbsent(normalizedKey, ignored -> new LinkedHashSet<>())
                        .add(normalizedDay);
            }
        }

        Map<String, List<String>> result = LotteryStationScheduleSupport.toOrderedListMap(drawDaysByStation);

        mergeHoChiMinhFallback(scheduleDocument, result);
        return result;
    }

    String parseDrawTime(Document scheduleDocument, String region) {
        if (scheduleDocument == null) {
            return null;
        }
        if (!SOUTHERN_REGION.equals(normalizeRegion(region))) {
            return null;
        }

        Matcher matcher = SOUTHERN_DRAW_TIME_PATTERN.matcher(scheduleDocument.text());
        if (matcher.find()) {
            return matcher.group(1) + ":" + matcher.group(2);
        }
        return null;
    }

    private void mergeHoChiMinhFallback(Document scheduleDocument, Map<String, List<String>> drawDaysByStation) {
        String hcmKey = normalizer.normalizeKey(MinhNgocStationNameNormalizer.HCM_CANONICAL_NAME);
        List<String> existing = new ArrayList<>(drawDaysByStation.getOrDefault(hcmKey, List.of()));
        if (existing.contains("MONDAY") && existing.contains("SATURDAY")) {
            return;
        }

        Matcher matcher = HCM_SCHEDULE_FALLBACK_PATTERN.matcher(scheduleDocument.text());
        while (matcher.find()) {
            String day = LotteryStationScheduleSupport.toDayOfWeekName(matcher.group(1));
            if (!existing.contains(day)) {
                existing.add(day);
            }
        }

        if (!existing.isEmpty()) {
            drawDaysByStation.put(hcmKey, existing);
        }
    }

    private String normalizeRegion(String region) {
        return LotteryStationScheduleSupport.normalizeRegion(region);
    }
}
