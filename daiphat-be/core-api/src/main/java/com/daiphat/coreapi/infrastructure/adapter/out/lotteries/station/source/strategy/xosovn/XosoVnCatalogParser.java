package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.station.source.strategy.xosovn;

import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourceItem;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class XosoVnCatalogParser {

    private static final Pattern LOTTERY_PUSH_PATTERN = Pattern.compile(
            "lotteryPrize\\.push\\(\\{\\s*'value':\\s*'([^']+)'\\s*,\\s*'key':\\s*'[^']+'\\s*,\\s*'dataUrl':\\s*'([^']+)'\\s*}\\)"
    );

    private final XosoVnStationNameNormalizer normalizer;

    XosoVnCatalogParser(XosoVnStationNameNormalizer normalizer) {
        this.normalizer = normalizer;
    }

    List<LotteryStationSourceItem> parse(
            Document catalogDocument,
            String region,
            String regionPathPrefix,
            String drawTime,
            Map<String, List<String>> drawDaysByStation
    ) {
        if (catalogDocument == null) {
            return List.of();
        }

        List<LotteryStationSourceItem> items = new ArrayList<>();
        Elements scripts = catalogDocument.select("script");
        for (Element script : scripts) {
            String scriptData = script.data();
            if (!scriptData.contains("lotteryPrize.push")) {
                continue;
            }

            Matcher matcher = LOTTERY_PUSH_PATTERN.matcher(scriptData);
            while (matcher.find()) {
                String name = matcher.group(1);
                String sourcePath = matcher.group(2);
                if (!sourcePath.startsWith(regionPathPrefix)) {
                    continue;
                }

                String canonicalName = normalizer.toCanonicalName(name);
                List<String> drawDays = drawDaysByStation.getOrDefault(normalizer.normalizeKey(canonicalName), List.of());
                items.add(LotteryStationSourceItem.builder()
                        .name(name)
                        .canonicalName(canonicalName)
                        .region(region)
                        .drawTime(drawTime)
                        .drawDays(drawDays)
                        .sourcePath(sourcePath)
                        .note(buildNote(drawDays))
                        .build());
            }
            if (!items.isEmpty()) {
                break;
            }
        }

        return items;
    }

    private String buildNote(List<String> drawDays) {
        if (drawDays.isEmpty()) {
            return "Catalog parsed from Xoso.vn, schedule not matched";
        }
        return "Catalog + schedule parsed from Xoso.vn";
    }
}
