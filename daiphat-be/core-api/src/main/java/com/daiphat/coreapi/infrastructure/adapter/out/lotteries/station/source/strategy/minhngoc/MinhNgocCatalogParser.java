package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.station.source.strategy.minhngoc;

import com.daiphat.coreapi.application.dto.lotteries.LotteryStationSourceItem;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class MinhNgocCatalogParser {

    private static final String RESULT_PREFIX = "Kết quả xổ số ";

    private final MinhNgocStationNameNormalizer normalizer;

    MinhNgocCatalogParser(MinhNgocStationNameNormalizer normalizer) {
        this.normalizer = normalizer;
    }

    Map<String, LotteryStationSourceItem> parse(Document catalogDocument, String region, String resultPathPrefix) {
        if (catalogDocument == null) {
            return Map.of();
        }

        Map<String, LotteryStationSourceItem> items = new LinkedHashMap<>();
        Elements links = catalogDocument.select("a[href^=" + resultPathPrefix + "]");
        for (Element link : links) {
            String href = link.attr("href");
            String rawName = link.text().trim();
            if (!rawName.startsWith(RESULT_PREFIX)) {
                continue;
            }

            String name = rawName.substring(RESULT_PREFIX.length()).trim();
            if (name.isBlank()) {
                continue;
            }

            String canonicalName = normalizer.toCanonicalName(name);
            String normalizedKey = normalizer.normalizeKey(canonicalName);
            items.put(normalizedKey, LotteryStationSourceItem.builder()
                    .name(name)
                    .canonicalName(canonicalName)
                    .region(region)
                    .drawTime(null)
                    .drawDays(List.of())
                    .sourcePath(href)
                    .note("Parsed from Minh Ngoc catalog")
                    .build());
        }
        return items;
    }
}
