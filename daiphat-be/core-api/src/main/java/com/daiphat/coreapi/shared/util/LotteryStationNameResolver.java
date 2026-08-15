package com.daiphat.coreapi.shared.util;

import org.apache.commons.text.similarity.LevenshteinDistance;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Maps a free-text station name from a supplier file onto a station in the system.
 *
 * <p>Matching runs in three tiers and stops at the first tier that yields a single
 * candidate: exact (after normalization), learned alias, then fuzzy. Callers pass
 * in the candidate set - normally only the stations that actually draw on the row's
 * draw date, which keeps fuzzy matching both cheap and far more accurate.
 */
@Component
public class LotteryStationNameResolver {

    /**
     * Below this similarity a fuzzy hit is treated as no match at all. Tuned so
     * that a missing diacritic or a one-character typo still matches, while two
     * different provinces never do.
     */
    private static final double FUZZY_THRESHOLD = 0.85;

    private static final int MAX_SUGGESTIONS = 3;

    private static final LevenshteinDistance DISTANCE = LevenshteinDistance.getDefaultInstance();

    public enum MatchKind {
        EXACT,
        ALIAS,
        FUZZY,
        AMBIGUOUS,
        NOT_FOUND
    }

    public record Candidate(Long lotteryStationId, String name) {
    }

    public record Suggestion(Long lotteryStationId, String name, double score) {
    }

    public record Match(
            Long lotteryStationId,
            String stationName,
            MatchKind kind,
            List<Suggestion> suggestions
    ) {
        public boolean isResolved() {
            return lotteryStationId != null;
        }

        static Match of(Candidate candidate, MatchKind kind) {
            return new Match(candidate.lotteryStationId(), candidate.name(), kind, List.of());
        }

        static Match unresolved(MatchKind kind, List<Suggestion> suggestions) {
            return new Match(null, null, kind, suggestions);
        }
    }

    /**
     * @param rawName    station text exactly as it appears in the file
     * @param candidates stations the row could legitimately refer to
     * @param aliasIndex normalized alias -> station id, learned from earlier imports
     */
    public Match resolve(String rawName, List<Candidate> candidates, Map<String, Long> aliasIndex) {
        String normalized = VietnameseTextNormalizer.normalizeStationName(rawName);
        if (normalized.isEmpty() || candidates == null || candidates.isEmpty()) {
            return Match.unresolved(MatchKind.NOT_FOUND, List.of());
        }

        Set<String> inputForms = Set.copyOf(VietnameseTextNormalizer.stationNameForms(rawName));
        List<Candidate> exact = candidates.stream()
                .filter(candidate -> VietnameseTextNormalizer.stationNameForms(candidate.name())
                        .stream()
                        .anyMatch(inputForms::contains))
                .toList();
        if (exact.size() == 1) {
            return Match.of(exact.getFirst(), MatchKind.EXACT);
        }
        if (exact.size() > 1) {
            return Match.unresolved(MatchKind.AMBIGUOUS, toSuggestions(exact));
        }

        if (aliasIndex != null) {
            Long aliasStationId = aliasIndex.get(normalized);
            if (aliasStationId != null) {
                return candidates.stream()
                        .filter(candidate -> aliasStationId.equals(candidate.lotteryStationId()))
                        .findFirst()
                        .map(candidate -> Match.of(candidate, MatchKind.ALIAS))
                        // The alias points at a station that cannot draw on this date;
                        // fall through to fuzzy rather than returning a wrong station.
                        .orElseGet(() -> fuzzy(inputForms, candidates));
            }
        }

        return fuzzy(inputForms, candidates);
    }

    private Match fuzzy(Set<String> inputForms, List<Candidate> candidates) {
        List<Suggestion> scored = candidates.stream()
                .map(candidate -> score(inputForms, candidate))
                .filter(suggestion -> suggestion.score() >= FUZZY_THRESHOLD)
                .sorted(Comparator.comparingDouble(Suggestion::score).reversed())
                .toList();

        if (scored.isEmpty()) {
            return Match.unresolved(MatchKind.NOT_FOUND, nearest(inputForms, candidates));
        }
        if (scored.size() == 1 || scored.get(0).score() > scored.get(1).score()) {
            Suggestion best = scored.getFirst();
            return new Match(best.lotteryStationId(), best.name(), MatchKind.FUZZY, List.of());
        }
        return Match.unresolved(MatchKind.AMBIGUOUS, scored.stream().limit(MAX_SUGGESTIONS).toList());
    }

    /** Best-effort hints shown next to a NOT_FOUND row so the user can pick manually. */
    private List<Suggestion> nearest(Set<String> inputForms, List<Candidate> candidates) {
        return candidates.stream()
                .map(candidate -> score(inputForms, candidate))
                .sorted(Comparator.comparingDouble(Suggestion::score).reversed())
                .limit(MAX_SUGGESTIONS)
                .toList();
    }

    /** Scores a candidate by its best-matching name form against any input form. */
    private Suggestion score(Set<String> inputForms, Candidate candidate) {
        double best = 0d;
        for (String candidateForm : VietnameseTextNormalizer.stationNameForms(candidate.name())) {
            for (String inputForm : inputForms) {
                best = Math.max(best, similarity(inputForm, candidateForm));
            }
        }
        return new Suggestion(candidate.lotteryStationId(), candidate.name(), best);
    }

    private List<Suggestion> toSuggestions(List<Candidate> candidates) {
        List<Suggestion> suggestions = new ArrayList<>();
        for (Candidate candidate : candidates) {
            suggestions.add(new Suggestion(candidate.lotteryStationId(), candidate.name(), 1.0));
        }
        return suggestions;
    }

    private double similarity(String left, String right) {
        if (left.isEmpty() || right.isEmpty()) {
            return 0d;
        }
        if (left.equals(right)) {
            return 1d;
        }
        int distance = DISTANCE.apply(left, right);
        int longest = Math.max(left.length(), right.length());
        return 1d - ((double) distance / longest);
    }
}
