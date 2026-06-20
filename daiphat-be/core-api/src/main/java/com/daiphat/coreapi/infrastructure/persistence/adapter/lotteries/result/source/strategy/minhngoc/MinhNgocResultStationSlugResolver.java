package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.result.source.strategy.minhngoc;

import java.text.Normalizer;
import java.util.Locale;

final class MinhNgocResultStationSlugResolver {

    String toSlug(String stationName) {
        String canonicalName = stationName == null ? "" : stationName.trim().replaceAll("\\s+", " ");
        return switch (normalizeKey(canonicalName)) {
            case "tp hcm", "tphcm", "ho chi minh" -> "tp-hcm";
            case "hue", "thua thien hue" -> "thua-thien-hue";
            default -> normalizeKey(canonicalName).replace(' ', '-');
        };
    }

    private String normalizeKey(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("đ", "d")
                .replace("Đ", "D");
        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }
}
