package com.daiphat.coreapi.shared.util;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

/**
 * Normalizes free-text coming from supplier spreadsheets so it can be matched
 * against data stored in the system (station names, column headers).
 */
public final class VietnameseTextNormalizer {

    private static final char NON_BREAKING_SPACE = ' ';
    private static final char BYTE_ORDER_MARK = '﻿';
    private static final char LETTER_D_WITH_STROKE = 'đ';

    /**
     * Prefixes suppliers commonly put in front of a station name. Ordered longest
     * first so that "xo so kien thiet" is stripped before the shorter "xo so".
     */
    private static final List<String> STATION_NAME_PREFIXES = List.of(
            "xo so kien thiet",
            "xskt",
            "xo so",
            "xs",
            "dai"
    );

    private VietnameseTextNormalizer() {
    }

    /**
     * Lowercases, strips Vietnamese diacritics and collapses whitespace.
     * Returns an empty string for null/blank input.
     */
    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }

        // Non-breaking spaces and a stray BOM survive trim() and would break every comparison.
        String value = raw.replace(NON_BREAKING_SPACE, ' ')
                .replace(String.valueOf(BYTE_ORDER_MARK), "")
                .trim();
        if (value.isEmpty()) {
            return "";
        }

        value = value.toLowerCase(Locale.ROOT);
        // NFD leaves d-with-stroke intact - it is a distinct letter, not a composed form.
        value = value.replace(LETTER_D_WITH_STROKE, 'd');
        value = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        return value.replaceAll("\\s+", " ").trim();
    }

    /**
     * Canonical key for a station name: normalized, with punctuation flattened to
     * spaces. The "xo so kien thiet" style prefix is NOT removed here - see
     * {@link #stationNameForms(String)} for why.
     */
    public static String normalizeStationName(String raw) {
        String value = normalize(raw);
        if (value.isEmpty()) {
            return "";
        }
        // Suppliers separate the prefix from the name with punctuation as often as with a space.
        return value.replaceAll("[.,;:_\\-/]+", " ").replaceAll("\\s+", " ").trim();
    }

    /**
     * All forms a station name may legitimately take: the canonical key plus the
     * same key with a supplier prefix removed.
     *
     * <p>Both are returned rather than only the stripped form because stripping is
     * not safe on its own - "Dai Loc" is a real name, not the prefix "dai" plus
     * "Loc". Matching two form-sets against each other lets "Dai Tien Giang" hit
     * "Tien Giang" without turning "Dai Loc" into "Loc".
     */
    public static List<String> stationNameForms(String raw) {
        String canonical = normalizeStationName(raw);
        if (canonical.isEmpty()) {
            return List.of();
        }

        for (String prefix : STATION_NAME_PREFIXES) {
            if (canonical.startsWith(prefix + " ")) {
                String stripped = canonical.substring(prefix.length()).trim();
                if (!stripped.isEmpty()) {
                    return List.of(canonical, stripped);
                }
            }
        }
        return List.of(canonical);
    }

    /**
     * Normalizes a column header for mapping auto-detection: same as
     * {@link #normalize(String)} but also drops separators so that "so luong",
     * "so_luong" and "soluong" collapse together.
     */
    public static String normalizeHeader(String raw) {
        return normalize(raw).replaceAll("[^a-z0-9]", "");
    }
}
