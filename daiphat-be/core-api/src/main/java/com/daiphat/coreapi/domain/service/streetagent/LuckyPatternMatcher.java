package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyMatchPosition;
import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyPatternType;

import java.util.Arrays;

public final class LuckyPatternMatcher {
    private LuckyPatternMatcher() {
    }

    public static boolean matches(
            String ticketNumbers,
            LuckyPatternType patternType,
            String exactNumbers,
            String matchDigits,
            LuckyMatchPosition matchPosition
    ) {
        if (ticketNumbers == null || ticketNumbers.isBlank() || patternType == null) {
            return false;
        }
        if (patternType == LuckyPatternType.EXACT) {
            return Arrays.stream(value(exactNumbers).split(","))
                    .map(String::trim)
                    .anyMatch(ticketNumbers::equals);
        }
        String digits = value(matchDigits).trim();
        if (digits.isEmpty()) {
            return false;
        }
        LuckyMatchPosition position = matchPosition == null ? LuckyMatchPosition.ANYWHERE : matchPosition;
        return switch (position) {
            case PREFIX -> ticketNumbers.startsWith(digits);
            case SUFFIX -> ticketNumbers.endsWith(digits);
            case ANYWHERE -> ticketNumbers.contains(digits);
        };
    }

    private static String value(String raw) {
        return raw == null ? "" : raw;
    }
}
