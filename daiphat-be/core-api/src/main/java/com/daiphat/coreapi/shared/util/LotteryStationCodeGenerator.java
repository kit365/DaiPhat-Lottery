package com.daiphat.coreapi.shared.util;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.function.Predicate;

/**
 * Builds the short business code of a lottery station from its name.
 *
 * <p>"Tiền Giang" becomes TG, "TP. Hồ Chí Minh" becomes TPHCM - the initials a
 * warehouse clerk would write by hand. The code is what exported files carry and
 * imported files are matched on, so it has to be short, stable and unique.
 */
@Component
public class LotteryStationCodeGenerator {

    public static final int MAX_LENGTH = 20;

    /** Long enough to stay readable, short enough to type. */
    private static final int MAX_INITIALS = 6;

    private static final int MIN_LENGTH = 2;

    /**
     * @param name     station name, with or without the "xổ số kiến thiết" prefix
     * @param isTaken  tells whether a candidate code is already used; a numeric
     *                 suffix is appended until it is not
     * @return a unique upper-case code, or null when the name yields no letters
     */
    public String generate(String name, Predicate<String> isTaken) {
        String base = baseCode(name);
        if (base == null) {
            return null;
        }
        if (isTaken == null || !isTaken.test(base)) {
            return base;
        }

        for (int suffix = 2; suffix < 1000; suffix++) {
            String candidate = trimTo(base, MAX_LENGTH - String.valueOf(suffix).length()) + suffix;
            if (!isTaken.test(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    /** The code a name maps to before uniqueness is considered. */
    public String baseCode(String name) {
        // The supplier prefix carries no information: every station would start "XSKT".
        String normalized = VietnameseTextNormalizer.stationNameForms(name).stream()
                .reduce((first, second) -> second)
                .orElse("");
        if (normalized.isBlank()) {
            return null;
        }

        StringBuilder initials = new StringBuilder();
        for (String word : normalized.split("\\s+")) {
            String letters = word.replaceAll("[^a-z0-9]", "");
            if (letters.isEmpty()) {
                continue;
            }
            initials.append(letters.charAt(0));
            if (initials.length() >= MAX_INITIALS) {
                break;
            }
        }

        // A single-word name ("Vietlott") gives one letter, which is too little to
        // recognise; fall back to its opening letters instead.
        if (initials.length() < MIN_LENGTH) {
            String compact = normalized.replaceAll("[^a-z0-9]", "");
            initials = new StringBuilder(trimTo(compact, 3));
        }

        String code = initials.toString().toUpperCase(Locale.ROOT);
        return code.isBlank() ? null : trimTo(code, MAX_LENGTH);
    }

    /** Normalizes an operator-typed code so comparisons are predictable. */
    public String normalize(String rawCode) {
        if (rawCode == null) {
            return null;
        }
        String code = rawCode.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_-]", "");
        return code.isEmpty() ? null : trimTo(code, MAX_LENGTH);
    }

    private String trimTo(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
