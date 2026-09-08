package com.daiphat.coreapi.infrastructure.config.data;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Constants and deterministic prize/ticket helpers ported from the former
 * {@code scripts/local-seed/*phu123*win50*.sql} fixtures.
 */
public final class Phu123Win50SeedCatalog {

    public static final String SEED_MARKER = "WIN50_PHU123_SEED";
    public static final String USERNAME = "phu123";
    public static final String EMAIL = "phujason1992@gmail.com";
    public static final String DEFAULT_PASSWORD = "Phu123456";
    public static final String PHONE = "0918234567";
    public static final String FIRST_NAME = "Phú";
    public static final String LAST_NAME = "Jason";
    public static final String ORDER_CODE_PREFIX = "ORD-WIN50-PHU123-";
    public static final String BATCH_CODE_PREFIX = "WIN50-PHU123-";
    public static final String SETTLEMENT_CODE_PREFIX = "SS-WIN50-PHU123-";
    public static final String SERIAL_PREFIX = "p123";
    public static final String LINE_CODE_PREFIX = "LO-PHU123-";

    public static final List<String> PRIZES = List.of(
            "DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "DB_PHU", "KK"
    );
    /** Counts per prize: 20 large (handed over) + 30 online-claimable. */
    public static final int[] PRIZE_COUNTS = {5, 5, 5, 5, 5, 5, 4, 4, 4, 5, 3};
    public static final Set<String> ONLINE_CLAIMABLE = Set.of("G3", "G4", "G5", "G6", "G7", "G8", "KK");
    public static final List<String> RESULT_DETAIL_CODES = List.of(
            "DB", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"
    );

    /** order_n -> (slots, cumStart exclusive, cumEnd inclusive) covering winners 1..50. */
    public static final List<OrderPlan> ORDER_PLANS = List.of(
            new OrderPlan(1, 6, 0, 6),
            new OrderPlan(2, 5, 6, 11),
            new OrderPlan(3, 5, 11, 16),
            new OrderPlan(4, 4, 16, 20),
            new OrderPlan(5, 4, 20, 24),
            new OrderPlan(6, 4, 24, 28),
            new OrderPlan(7, 3, 28, 31),
            new OrderPlan(8, 3, 31, 34),
            new OrderPlan(9, 3, 34, 37),
            new OrderPlan(10, 3, 37, 40),
            new OrderPlan(11, 5, 40, 45),
            new OrderPlan(12, 5, 45, 50)
    );

    private Phu123Win50SeedCatalog() {
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

    public static String digitBlock(String seed, int len, int salt) {
        String digest = md5Hex(seed + ":" + salt);
        String hex15 = digest.substring(0, 15);
        BigInteger n = new BigInteger(hex15, 16);
        long mod = pow10(len);
        long value = Math.abs(n.longValue()) % mod;
        return String.format("%0" + len + "d", value);
    }

    public static String nudge(String tail, String forbidden) {
        if (tail == null || !tail.equals(forbidden)) {
            return tail;
        }
        int last = Character.getNumericValue(tail.charAt(tail.length() - 1));
        char next = Character.forDigit((last + 1) % 10, 10);
        return tail.substring(0, tail.length() - 1) + next;
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

    public static String firstPrize(String ticket, Map<String, String> results) {
        for (String prize : PRIZES) {
            String win = ("DB_PHU".equals(prize) || "KK".equals(prize))
                    ? results.get("DB")
                    : results.get(prize);
            if (win != null && matches(ticket, win, prize)) {
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

    public static Map<String, String> buildResults(long stationId, LocalDate drawDate) {
        String seed = stationId + ":" + drawDate;
        String db = digitBlock(seed, 6, 1);
        String g1 = nudge(right(digitBlock(seed, 6, 11), 5), right(db, 5));
        String g2 = nudge(right(digitBlock(seed, 6, 12), 5), right(db, 5));
        String g3 = nudge(right(digitBlock(seed, 6, 13), 5), right(db, 5));
        String g4 = nudge(right(digitBlock(seed, 6, 14), 5), right(db, 5));
        String g5 = nudge(right(digitBlock(seed, 6, 15), 4), right(db, 4));
        String g6 = nudge(right(digitBlock(seed, 6, 16), 4), right(db, 4));
        String g7 = nudge(right(digitBlock(seed, 6, 17), 3), right(db, 3));
        String g8 = nudge(right(digitBlock(seed, 6, 18), 2), right(db, 2));

        Map<String, String> results = new LinkedHashMap<>();
        results.put("DB", db);
        results.put("G1", digitBlock(seed, 1, 21) + g1);
        results.put("G2", digitBlock(seed, 1, 22) + g2);
        results.put("G3", digitBlock(seed, 1, 23) + g3);
        results.put("G4", digitBlock(seed, 1, 24) + g4);
        results.put("G5", g5);
        results.put("G6", g6);
        results.put("G7", g7);
        results.put("G8", g8);
        return results;
    }

    public static String buildSerial(
            LocalDate drawDate,
            String stationCode,
            int idx,
            String numbers
    ) {
        String yyMMdd = String.format(
                "%02d%02d%02d",
                drawDate.getYear() % 100,
                drawDate.getMonthValue(),
                drawDate.getDayOfMonth()
        );
        String hash = md5Hex(stationCode + ":" + drawDate + ":" + numbers + ":" + idx).substring(0, 6);
        String raw = ("p123" + yyMMdd + stationCode + String.format("%02d", idx) + hash).toLowerCase();
        return raw.replaceAll("[^a-z0-9]", "");
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

    private static String md5Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("MD5 not available", e);
        }
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
