package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries.station.source.strategy.xosovn;

import java.text.Normalizer;
import java.util.Locale;

final class XosoVnStationNameNormalizer {

    private static final String HCM_CANONICAL_NAME = "Hồ Chí Minh";

    String toCanonicalName(String rawName) {
        String compactName = rawName == null ? "" : rawName.trim().replaceAll("\\s+", " ");
        return switch (normalizeKey(compactName)) {
            case "tphcm", "tp hcm", "tp h c m", "ho chi minh" -> HCM_CANONICAL_NAME;
            default -> compactName;
        };
    }

    String normalizeKey(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("đ", "d")
                .replace("Đ", "D");
        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }
}
