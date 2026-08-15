package com.daiphat.coreapi.shared.util.tabular;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;

/**
 * Converts raw cell text from a supplier file into typed values.
 * Everything here returns {@link Optional#empty()} instead of throwing so the
 * caller can turn a bad cell into a per-row issue rather than a failed upload.
 */
public final class TabularValueParser {

    /**
     * Excel stores dates as a day offset from this epoch (the 1900 date system,
     * including its historical leap-year bug, hence Dec 30 rather than Dec 31).
     */
    private static final LocalDate EXCEL_EPOCH = LocalDate.of(1899, 12, 30);

    private static final char NON_BREAKING_SPACE = ' ';

    private static final int EXCEL_SERIAL_MIN = 20000;   // ~1954
    private static final int EXCEL_SERIAL_MAX = 60000;   // ~2064

    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ofPattern("d/M/uuuu"),
            DateTimeFormatter.ofPattern("d-M-uuuu"),
            DateTimeFormatter.ofPattern("uuuu-M-d"),
            DateTimeFormatter.ofPattern("uuuu/M/d"),
            DateTimeFormatter.ofPattern("d.M.uuuu")
    );

    private TabularValueParser() {
    }

    public static Optional<Integer> parseQuantity(String raw, TabularNumberStyle style) {
        return parseDecimal(raw, style)
                .filter(value -> value.stripTrailingZeros().scale() <= 0)
                .filter(value -> value.compareTo(BigDecimal.valueOf(Integer.MAX_VALUE)) <= 0)
                .map(BigDecimal::intValue);
    }

    public static Optional<BigDecimal> parseDecimal(String raw, TabularNumberStyle style) {
        String value = clean(raw);
        if (value == null) {
            return Optional.empty();
        }

        // Accounting exports write negatives as "(1.000)".
        boolean negative = value.startsWith("(") && value.endsWith(")");
        if (negative) {
            value = value.substring(1, value.length() - 1).trim();
        }
        if (value.startsWith("-")) {
            negative = true;
            value = value.substring(1).trim();
        }
        if (value.startsWith("+")) {
            value = value.substring(1).trim();
        }

        // Strip currency noise suppliers leave in the cell.
        value = value.replaceAll("[^0-9.,]", "");
        if (value.isEmpty()) {
            return Optional.empty();
        }

        String normalized = normalizeSeparators(value, style);
        if (normalized == null) {
            return Optional.empty();
        }

        try {
            BigDecimal parsed = new BigDecimal(normalized);
            return Optional.of(negative ? parsed.negate() : parsed);
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    public static Optional<LocalDate> parseDate(String raw, String explicitFormat) {
        String value = clean(raw);
        if (value == null) {
            return Optional.empty();
        }

        if (explicitFormat != null && !explicitFormat.isBlank()) {
            try {
                return Optional.of(LocalDate.parse(value, DateTimeFormatter.ofPattern(explicitFormat.trim())));
            } catch (IllegalArgumentException | DateTimeParseException e) {
                return Optional.empty();
            }
        }

        // Excel silently turns a date column into a serial number often enough
        // that we have to recognise it before trying textual patterns.
        if (value.matches("\\d{4,5}")) {
            int serial = Integer.parseInt(value);
            if (serial >= EXCEL_SERIAL_MIN && serial <= EXCEL_SERIAL_MAX) {
                return Optional.of(EXCEL_EPOCH.plusDays(serial));
            }
        }

        // Drop a trailing time part ("12/08/2026 00:00:00").
        String datePart = value.split("[ T]")[0];
        for (DateTimeFormatter formatter : DATE_FORMATS) {
            try {
                return Optional.of(LocalDate.parse(datePart, formatter));
            } catch (DateTimeParseException ignored) {
                // try the next pattern
            }
        }
        return Optional.empty();
    }

    private static String normalizeSeparators(String value, TabularNumberStyle style) {
        boolean hasDot = value.indexOf('.') >= 0;
        boolean hasComma = value.indexOf(',') >= 0;

        TabularNumberStyle resolved = style == null ? TabularNumberStyle.AUTO : style;
        if (resolved == TabularNumberStyle.AUTO) {
            if (hasDot && hasComma) {
                // Whichever separator comes last is the decimal one.
                resolved = value.lastIndexOf(',') > value.lastIndexOf('.')
                        ? TabularNumberStyle.VN
                        : TabularNumberStyle.EN;
            } else if (hasComma) {
                // A lone comma with exactly 3 trailing digits is a thousands separator.
                resolved = value.matches(".*,\\d{3}$") ? TabularNumberStyle.EN : TabularNumberStyle.VN;
            } else if (hasDot) {
                resolved = value.matches(".*\\.\\d{3}$") ? TabularNumberStyle.VN : TabularNumberStyle.EN;
            } else {
                return value;
            }
        }

        String result = resolved == TabularNumberStyle.VN
                ? value.replace(".", "").replace(',', '.')
                : value.replace(",", "");

        return result.chars().filter(ch -> ch == '.').count() > 1 ? null : result;
    }

    private static String clean(String raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.replace(NON_BREAKING_SPACE, ' ').trim();
        return value.isEmpty() ? null : value;
    }
}
