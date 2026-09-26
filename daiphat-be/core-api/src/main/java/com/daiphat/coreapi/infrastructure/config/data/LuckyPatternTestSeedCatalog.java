package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyMatchPosition;
import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyPatternType;

import java.util.List;

/**
 * Lucky patterns and matching ticket numbers for vendor allocation checks.
 */
public final class LuckyPatternTestSeedCatalog {

    public static final String SEED_MARKER = SharedSeedConstants.LUCKY_SEED_MARKER;
    public static final String SERIAL_PREFIX = SharedSeedConstants.LUCKY_SERIAL_PREFIX;

    private LuckyPatternTestSeedCatalog() {
    }

    public record PatternSeed(
            String name,
            String description,
            LuckyPatternType patternType,
            String exactNumbers,
            String matchDigits,
            LuckyMatchPosition matchPosition,
            String badgeLabel,
            String badgeColor,
            int priority
    ) {
    }

    /** Ticket numbers that should match the seeded patterns (for manual UI checks). */
    public record TicketSeed(String numbers, String note) {
    }

    public static List<PatternSeed> patterns() {
        return List.of(
                new PatternSeed(
                        "Lộc phát",
                        "Khớp chính xác 686868.",
                        LuckyPatternType.EXACT,
                        "686868",
                        null,
                        null,
                        "Lộc phát",
                        "#FFAB00",
                        100
                ),
                new PatternSeed(
                        "Đuôi 68",
                        "Khớp đuôi 68.",
                        LuckyPatternType.DIGIT_MATCH,
                        null,
                        "68",
                        LuckyMatchPosition.SUFFIX,
                        "Đuôi 68",
                        "#00B8D9",
                        80
                ),
                new PatternSeed(
                        "Đầu 39",
                        "Khớp đầu 39.",
                        LuckyPatternType.DIGIT_MATCH,
                        null,
                        "39",
                        LuckyMatchPosition.PREFIX,
                        "Đầu 39",
                        "#22C55E",
                        70
                )
        );
    }

    public static List<TicketSeed> tickets() {
        return List.of(
                new TicketSeed("686868", "EXACT Lộc phát"),
                new TicketSeed("123468", "SUFFIX 68"),
                new TicketSeed("390001", "PREFIX 39"),
                new TicketSeed("399968", "PREFIX 39 + SUFFIX 68")
        );
    }
}
