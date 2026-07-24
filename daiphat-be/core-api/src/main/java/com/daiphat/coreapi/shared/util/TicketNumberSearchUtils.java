package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode;

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
        String normalized = search.trim().toLowerCase();
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
        String numbers = ticketNumbers.toLowerCase();
        String fragment = search.trim().toLowerCase();
        TicketSearchMode effective = mode != null ? mode : TicketSearchMode.CONTAINS;
        return switch (effective) {
            case SUFFIX -> numbers.endsWith(fragment);
            case PREFIX -> numbers.startsWith(fragment);
            case EXACT -> numbers.equals(fragment);
            case CONTAINS -> numbers.contains(fragment);
        };
    }
}
