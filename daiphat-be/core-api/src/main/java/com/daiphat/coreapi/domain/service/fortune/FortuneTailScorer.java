package com.daiphat.coreapi.domain.service.fortune;

import com.daiphat.coreapi.domain.model.enums.fortune.FiveElement;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Random;
import java.util.UUID;

/**
 * Deterministic scoring and weighted pick of lucky two-digit tails.
 * Same (userId, castDate) always yields the same primary pick for a fixed inventory set.
 */
public final class FortuneTailScorer {

    public static final int USER_GENERATES_TAIL = 100;
    public static final int TAIL_GENERATES_USER = 70;
    public static final int SAME_ELEMENT = 40;
    public static final int USER_CONTROLS_TAIL = 10;
    public static final int TAIL_CONTROLS_USER = -80;
    public static final int DAY_GENERATES_TAIL = 15;
    public static final int TAIL_GENERATES_DAY = 10;
    public static final int DAY_SAME = 5;
    public static final int DAY_CONTROLS_TAIL = -10;
    public static final int TAIL_CONTROLS_DAY = -5;

    public static final int TOP_K = 5;
    private static final String SEED_SALT = "fortune-cast-v1";

    private FortuneTailScorer() {
    }

    public record ScoredTail(String tail, FiveElement element, int score) {
    }

    public record PickResult(
            String primaryTail,
            String finalTail,
            boolean fallbackUsed,
            String fallbackReason,
            List<ScoredTail> scored
    ) {
    }

    public static int scoreTail(FiveElement userElement, FiveElement dayElement, FiveElement tailElement) {
        int score = 0;
        score += relationScore(userElement, tailElement, true);
        score += relationScore(dayElement, tailElement, false);
        return score;
    }

    private static int relationScore(FiveElement anchor, FiveElement tail, boolean primary) {
        if (anchor == null || tail == null) {
            return 0;
        }
        if (anchor.generates() == tail) {
            return primary ? USER_GENERATES_TAIL : DAY_GENERATES_TAIL;
        }
        if (tail.generates() == anchor) {
            return primary ? TAIL_GENERATES_USER : TAIL_GENERATES_DAY;
        }
        if (anchor == tail) {
            return primary ? SAME_ELEMENT : DAY_SAME;
        }
        if (anchor.controls() == tail) {
            return primary ? USER_CONTROLS_TAIL : DAY_CONTROLS_TAIL;
        }
        if (tail.controls() == anchor) {
            return primary ? TAIL_CONTROLS_USER : TAIL_CONTROLS_DAY;
        }
        return 0;
    }

    public static List<ScoredTail> scoreAll(
            FiveElement userElement,
            FiveElement dayElement,
            List<String> availableTails
    ) {
        List<ScoredTail> scored = new ArrayList<>();
        for (String tail : availableTails) {
            if (tail == null || tail.length() != 2) {
                continue;
            }
            FiveElement element = FiveElementCatalog.elementForTail(tail);
            scored.add(new ScoredTail(tail, element, scoreTail(userElement, dayElement, element)));
        }
        scored.sort(Comparator
                .comparingInt(ScoredTail::score).reversed()
                .thenComparing(ScoredTail::tail));
        return scored;
    }

    public static PickResult pick(
            UUID userId,
            String castDateIso,
            FiveElement userElement,
            FiveElement dayElement,
            List<String> availableTails
    ) {
        return pick(userId, castDateIso, userElement, dayElement, availableTails, null);
    }

    /**
     * @param seedSalt optional entropy (e.g. for unlimited re-casts during testing)
     */
    public static PickResult pick(
            UUID userId,
            String castDateIso,
            FiveElement userElement,
            FiveElement dayElement,
            List<String> availableTails,
            String seedSalt
    ) {
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(castDateIso, "castDateIso");
        List<ScoredTail> scored = scoreAll(userElement, dayElement, availableTails);
        if (scored.isEmpty()) {
            throw new IllegalStateException("No available tails in inventory");
        }

        int best = scored.getFirst().score();
        List<ScoredTail> top = scored.stream()
                .filter(s -> s.score() == best)
                .limit(TOP_K)
                .toList();
        if (top.size() < TOP_K) {
            // Fill top-K with next-best scores when ties are fewer than K
            top = scored.stream().limit(Math.min(TOP_K, scored.size())).toList();
        }

        String seedKey = seedSalt == null || seedSalt.isBlank()
                ? castDateIso
                : castDateIso + "|" + seedSalt;
        String primary = weightedPick(top, seed(userId, seedKey));
        return new PickResult(primary, primary, false, null, scored);
    }

    /**
     * If primary is no longer in stock, pick the best remaining tail preferring same element.
     */
    public static PickResult applyFallback(PickResult primary, List<String> stillAvailable) {
        if (stillAvailable != null && stillAvailable.contains(primary.primaryTail())) {
            return primary;
        }
        List<ScoredTail> remaining = primary.scored().stream()
                .filter(s -> stillAvailable != null && stillAvailable.contains(s.tail()))
                .toList();
        if (remaining.isEmpty()) {
            throw new IllegalStateException("No fallback tails available");
        }
        FiveElement preferred = FiveElementCatalog.elementForTail(primary.primaryTail());
        String fallback = remaining.stream()
                .filter(s -> s.element() == preferred)
                .findFirst()
                .orElse(remaining.getFirst())
                .tail();
        return new PickResult(
                primary.primaryTail(),
                fallback,
                true,
                "Primary lucky tail " + primary.primaryTail() + " sold out; chose similar element tail " + fallback,
                primary.scored()
        );
    }

    static String weightedPick(List<ScoredTail> candidates, long seed) {
        if (candidates.size() == 1) {
            return candidates.getFirst().tail();
        }
        // Shift scores to positive weights
        int min = candidates.stream().mapToInt(ScoredTail::score).min().orElse(0);
        long[] weights = new long[candidates.size()];
        long total = 0;
        for (int i = 0; i < candidates.size(); i++) {
            weights[i] = (long) candidates.get(i).score() - min + 1;
            total += weights[i];
        }
        Random random = new Random(seed);
        long roll = Math.floorMod(random.nextLong(), total);
        long acc = 0;
        for (int i = 0; i < candidates.size(); i++) {
            acc += weights[i];
            if (roll < acc) {
                return candidates.get(i).tail();
            }
        }
        return candidates.getLast().tail();
    }

    static long seed(UUID userId, String castDateIso) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((userId + "|" + castDateIso + "|" + SEED_SALT)
                    .getBytes(StandardCharsets.UTF_8));
            long value = 0;
            for (int i = 0; i < 8; i++) {
                value = (value << 8) | (hash[i] & 0xffL);
            }
            return value;
        } catch (NoSuchAlgorithmException e) {
            return Objects.hash(userId, castDateIso, SEED_SALT);
        }
    }
}
