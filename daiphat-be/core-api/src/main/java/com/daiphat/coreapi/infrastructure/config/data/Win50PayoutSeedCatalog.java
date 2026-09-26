package com.daiphat.coreapi.infrastructure.config.data;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Prize/ticket helpers for {@link Win50PayoutSeedInitializer}.
 * Winners are taken from the shared {@link SharedSeedConstants#INVENTORY_SERIAL_PREFIX} pool.
 */
public final class Win50PayoutSeedCatalog {

    public static final String SEED_MARKER = SharedSeedConstants.WIN_MARKER;
    public static final String ORDER_CODE_PREFIX = SharedSeedConstants.WIN_ORDER_PREFIX;
    public static final String PAYMENT_REF_PREFIX = SharedSeedConstants.WIN_PAYMENT_REF_PREFIX;
    /** Legacy prefixes cleaned on reset (old Phu123Win50 runs). */
    public static final String LEGACY_ORDER_PREFIX = "ORD-WIN50-PHU123-";
    public static final String LEGACY_SERIAL_PREFIX = "p123";
    public static final String LEGACY_BATCH_PREFIX = "WIN50-PHU123-";
    public static final String LEGACY_MARKER = "WIN50_PHU123_SEED";

    public static final List<String> PRIZES = List.of(
            "DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "DB_PHU", "KK"
    );
    /**
     * Clean member demo: 8 online-claimable winners (G3–G7) for payout / request testing.
     * Counts align with {@link #PRIZES} order; zeros skip that prize.
     */
    public static final int[] PRIZE_COUNTS = {0, 0, 0, 2, 2, 2, 1, 1, 0, 0, 0};
    public static final int TARGET_WINNERS = 8;
    public static final int EXPECTED_ONLINE_CLAIMABLE = 8;
    public static final Set<String> ONLINE_CLAIMABLE = Set.of("G3", "G4", "G5", "G6", "G7", "G8", "KK");
    public static final List<String> RESULT_DETAIL_CODES = List.of(
            "DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"
    );
    /**
     * Result crawlers only store DB–G8; details on these derived prizes were written
     * by the old overlay that faked lottery results.
     */
    public static final List<String> FAKE_RESULT_PRIZE_CODES = List.of("DB_PHU", "KK");

    /** One COMPLETED order on {@code member} with 8 winning tickets. */
    public static final List<OrderPlan> ORDER_PLANS = List.of(
            new OrderPlan(1, 8, 0, 8)
    );

    private Win50PayoutSeedCatalog() {
    }

    public record OrderPlan(int orderN, int slots, int cumStart, int cumEnd) {
    }

    public record DrawResultKey(long stationId, LocalDate drawDate) {
    }

    public record Winner(
            int idx,
            long stationId,
            String stationCode,
            LocalDate drawDate,
            String numbers,
            String prize,
            String serial
    ) {
    }

    public static String padWin(String prizeCode, String win) {
        if ("G5".equals(prizeCode) || "G6".equals(prizeCode)) {
            return right(lpad(win, 4), 4);
        }
        if ("G7".equals(prizeCode)) {
            return right(lpad(win, 3), 3);
        }
        if ("G8".equals(prizeCode)) {
            return right(lpad(win, 2), 2);
        }
        return right(lpad(win, 6), 6);
    }

    public static boolean matches(String ticket, String win, String prize) {
        if ("DB".equals(prize)) {
            return ticket.equals(win);
        }
        if ("DB_PHU".equals(prize)) {
            return ticket.length() == win.length()
                    && win.length() >= 2
                    && ticket.charAt(0) != win.charAt(0)
                    && ticket.substring(1).equals(win.substring(1));
        }
        if ("KK".equals(prize)) {
            if (ticket.length() != win.length() || win.length() < 2 || ticket.charAt(0) != win.charAt(0)) {
                return false;
            }
            int diffCount = 0;
            for (int i = 1; i < win.length(); i++) {
                if (ticket.charAt(i) != win.charAt(i)) {
                    diffCount++;
                }
            }
            return diffCount == 1;
        }

        int digits = matchDigits(prize);
        if (digits == 0) {
            return false;
        }
        return right(ticket, digits).equals(right(padWin(prize, win), digits));
    }

    public static String firstPrize(String ticket, Map<String, List<String>> results) {
        for (String prize : PRIZES) {
            List<String> wins = ("DB_PHU".equals(prize) || "KK".equals(prize))
                    ? results.get("DB")
                    : results.get(prize);
            if (wins != null && wins.stream().anyMatch(win -> matches(ticket, win, prize))) {
                return prize;
            }
        }
        return null;
    }

    public static String craftTicket(String prize, String win, int variant) {
        if ("DB".equals(prize)) {
            return win;
        }
        if ("DB_PHU".equals(prize)) {
            int first = (Character.getNumericValue(win.charAt(0)) + 1 + variant) % 10;
            if (first == Character.getNumericValue(win.charAt(0))) {
                first = (Character.getNumericValue(win.charAt(0)) + 3) % 10;
            }
            return first + win.substring(1);
        }
        if ("KK".equals(prize)) {
            int pos = 2 + (variant % 5); // 1-based in SQL; convert to 0-based index below
            int index = pos - 1;
            int old = Character.getNumericValue(win.charAt(index));
            int newDigit = (old + 1 + variant) % 10;
            if (newDigit == old) {
                newDigit = (old + 3) % 10;
            }
            return win.substring(0, index) + newDigit + win.substring(index + 1);
        }

        int digits = matchDigits(prize);
        String tail = right(padWin(prize, win), digits);
        int prefLen = 6 - digits;
        int salt = variant * 97 + 17;
        if (prefLen <= 0) {
            return tail;
        }
        long mod = pow10(prefLen);
        return String.format("%0" + prefLen + "d", salt % mod) + tail;
    }

    private static int matchDigits(String prize) {
        return switch (prize) {
            case "G1", "G2", "G3", "G4" -> 5;
            case "G5", "G6" -> 4;
            case "G7" -> 3;
            case "G8" -> 2;
            default -> 0;
        };
    }

    private static String lpad(String value, int len) {
        String s = value == null ? "" : value;
        if (s.length() >= len) {
            return s;
        }
        return "0".repeat(len - s.length()) + s;
    }

    private static String right(String value, int len) {
        if (value == null) {
            return "";
        }
        if (value.length() <= len) {
            return value;
        }
        return value.substring(value.length() - len);
    }

    private static long pow10(int len) {
        long result = 1L;
        for (int i = 0; i < len; i++) {
            result *= 10L;
        }
        return result;
    }
}
