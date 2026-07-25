package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Pure helpers for public ticket number search (tra cứu vé thủ công).
 * Kept out of JPA Specification so modes can be unit-tested without Criteria API.
 */
public final class TicketNumberSearchUtils {

    private TicketNumberSearchUtils() {
    }

    /**
     * Builds a SQL LIKE pattern for the given mode.
     * EXACT returns the normalized literal (caller should use equality, not LIKE).
     */
    public static String toPattern(String search, TicketSearchMode mode) {
        if (search == null || search.isBlank()) {
            return null;
        }
        String normalized = search.trim().toLowerCase(Locale.ROOT);
        TicketSearchMode effective = mode != null ? mode : TicketSearchMode.CONTAINS;
        return switch (effective) {
            case SUFFIX -> "%" + normalized;
            case PREFIX -> normalized + "%";
            case EXACT -> normalized;
            case CONTAINS -> "%" + normalized + "%";
        };
    }

    /** True when EXACT mode should use equality instead of LIKE. */
    public static boolean isExact(TicketSearchMode mode) {
        return mode == TicketSearchMode.EXACT;
    }

    /**
     * In-memory match used by chat post-filter / unit tests — mirrors SQL semantics.
     */
    public static boolean matches(String ticketNumbers, String search, TicketSearchMode mode) {
        if (ticketNumbers == null || search == null || search.isBlank()) {
            return false;
        }
        String numbers = ticketNumbers.toLowerCase(Locale.ROOT);
        String fragment = search.trim().toLowerCase(Locale.ROOT);
        TicketSearchMode effective = mode != null ? mode : TicketSearchMode.CONTAINS;
        return switch (effective) {
            case SUFFIX -> numbers.endsWith(fragment);
            case PREFIX -> numbers.startsWith(fragment);
            case EXACT -> numbers.equals(fragment);
            case CONTAINS -> numbers.contains(fragment);
        };
    }

    /** Last 2 digits of a ticket number. Null if fewer than 2 digits. */
    public static String tailTwoDigits(String ticketNumbers) {
        if (ticketNumbers == null) {
            return null;
        }
        String digits = ticketNumbers.replaceAll("\\D", "");
        if (digits.length() < 2) {
            return null;
        }
        return digits.substring(digits.length() - 2);
    }

    /**
     * Parses CSV / list of ranges like {@code 00-09,20-29} into inclusive int pairs.
     * Invalid tokens are skipped.
     */
    public static List<int[]> parseTailRanges(List<String> rawRanges) {
        List<int[]> ranges = new ArrayList<>();
        if (rawRanges == null) {
            return ranges;
        }
        for (String raw : rawRanges) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String normalized = raw.trim().replace(" ", "").replace('–', '-');
            String[] parts = normalized.split("-");
            if (parts.length != 2) {
                continue;
            }
            try {
                int from = Integer.parseInt(parts[0]);
                int to = Integer.parseInt(parts[1]);
                if (from < 0 || to > 99 || from > to) {
                    continue;
                }
                ranges.add(new int[]{from, to});
            } catch (NumberFormatException ignored) {
                // skip invalid
            }
        }
        return ranges;
    }

    public static boolean matchesAnyTailRange(String ticketNumbers, List<String> rawRanges) {
        List<int[]> ranges = parseTailRanges(rawRanges);
        if (ranges.isEmpty()) {
            return true;
        }
        String tail = tailTwoDigits(ticketNumbers);
        if (tail == null) {
            return false;
        }
        int value = Integer.parseInt(tail);
        for (int[] range : ranges) {
            if (value >= range[0] && value <= range[1]) {
                return true;
            }
        }
        return false;
    }

    public static boolean isDoubleTail(String ticketNumbers) {
        String tail = tailTwoDigits(ticketNumbers);
        return tail != null && tail.charAt(0) == tail.charAt(1);
    }

    /** Số tiến: 2 số cuối liền kề tăng (01,12,23,...,89). */
    public static boolean isSequentialTail(String ticketNumbers) {
        String tail = tailTwoDigits(ticketNumbers);
        if (tail == null) {
            return false;
        }
        int first = Character.digit(tail.charAt(0), 10);
        int second = Character.digit(tail.charAt(1), 10);
        return first >= 0 && second >= 0 && second == first + 1;
    }

    /** Số lặp: toàn bộ dãy từ 3 chữ số trở lên là cùng một chữ số (111, 000000...). */
    public static boolean isRepeatingNumber(String ticketNumbers) {
        if (ticketNumbers == null) {
            return false;
        }
        String digits = ticketNumbers.replaceAll("\\D", "");
        if (digits.length() < 3) {
            return false;
        }
        char first = digits.charAt(0);
        for (int i = 1; i < digits.length(); i++) {
            if (digits.charAt(i) != first) {
                return false;
            }
        }
        return true;
    }

    public static boolean matchesAnyNumberType(String ticketNumbers, List<String> numberTypes) {
        if (numberTypes == null || numberTypes.isEmpty()) {
            return true;
        }
        for (String raw : numberTypes) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String type = raw.trim().toUpperCase(Locale.ROOT);
            boolean matched = switch (type) {
                case "DOUBLE" -> isDoubleTail(ticketNumbers);
                case "SEQUENTIAL" -> isSequentialTail(ticketNumbers);
                case "REPEATING" -> isRepeatingNumber(ticketNumbers);
                default -> false;
            };
            if (matched) {
                return true;
            }
        }
        return false;
    }

    public static List<String> normalizeSearchFragments(List<String> searches) {
        List<String> result = new ArrayList<>();
        if (searches == null) {
            return result;
        }
        for (String raw : searches) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String digits = raw.replaceAll("\\D", "");
            if (digits.length() >= 2) {
                result.add(digits.toLowerCase(Locale.ROOT));
            }
        }
        return result;
    }
}
