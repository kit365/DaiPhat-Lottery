package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.shared.util.LotteryStationNameResolver.Candidate;
import com.daiphat.coreapi.shared.util.LotteryStationNameResolver.Match;
import com.daiphat.coreapi.shared.util.LotteryStationNameResolver.MatchKind;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LotteryStationNameResolverTest {

    private final LotteryStationNameResolver resolver = new LotteryStationNameResolver();

    private static final List<Candidate> CANDIDATES = List.of(
            new Candidate(1L, "Tiền Giang"),
            new Candidate(2L, "Kiên Giang"),
            new Candidate(3L, "Đà Lạt")
    );

    @Test
    @DisplayName("An exact name matches regardless of case and diacritics")
    void resolve_exactMatch() {
        Match match = resolver.resolve("TIEN GIANG", CANDIDATES, Map.of());

        assertThat(match.kind()).isEqualTo(MatchKind.EXACT);
        assertThat(match.lotteryStationId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("A supplier prefix does not prevent an exact match")
    void resolve_exactMatchWithPrefix() {
        assertThat(resolver.resolve("XSKT Tiền Giang", CANDIDATES, Map.of()).lotteryStationId())
                .isEqualTo(1L);
        assertThat(resolver.resolve("Đài Tiền Giang", CANDIDATES, Map.of()).lotteryStationId())
                .isEqualTo(1L);
    }

    @Test
    @DisplayName("A learned alias resolves a name the exact tier cannot")
    void resolve_aliasMatch() {
        Match match = resolver.resolve("TG", CANDIDATES, Map.of("tg", 1L));

        assertThat(match.kind()).isEqualTo(MatchKind.ALIAS);
        assertThat(match.lotteryStationId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("An alias pointing outside the candidate set does not force a wrong station")
    void resolve_aliasOutsideCandidates() {
        Match match = resolver.resolve("XX", CANDIDATES, Map.of("xx", 99L));

        assertThat(match.isResolved()).isFalse();
    }

    @Test
    @DisplayName("A single-character typo still resolves via fuzzy matching")
    void resolve_fuzzyMatch() {
        Match match = resolver.resolve("Tiên Giag", CANDIDATES, Map.of());

        assertThat(match.kind()).isEqualTo(MatchKind.FUZZY);
        assertThat(match.lotteryStationId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Two different provinces never fuzzy-match onto each other")
    void resolve_doesNotMatchDifferentProvince() {
        Match match = resolver.resolve("Bình Dương", CANDIDATES, Map.of());

        assertThat(match.kind()).isEqualTo(MatchKind.NOT_FOUND);
        assertThat(match.isResolved()).isFalse();
    }

    @Test
    @DisplayName("A NOT_FOUND row still carries suggestions so the user can pick manually")
    void resolve_notFoundCarriesSuggestions() {
        Match match = resolver.resolve("Bình Dương", CANDIDATES, Map.of());

        assertThat(match.suggestions()).isNotEmpty();
    }

    @Test
    @DisplayName("Equally close candidates are reported as ambiguous rather than guessed")
    void resolve_ambiguousMatch() {
        List<Candidate> twins = List.of(
                new Candidate(1L, "Long An"),
                new Candidate(2L, "Long Ao")
        );

        Match match = resolver.resolve("Long Am", twins, Map.of());

        assertThat(match.kind()).isEqualTo(MatchKind.AMBIGUOUS);
        assertThat(match.isResolved()).isFalse();
        assertThat(match.suggestions()).hasSize(2);
    }

    @Test
    @DisplayName("Blank input and an empty candidate set are handled")
    void resolve_handlesEmptyInput() {
        assertThat(resolver.resolve("  ", CANDIDATES, Map.of()).kind()).isEqualTo(MatchKind.NOT_FOUND);
        assertThat(resolver.resolve("Tiền Giang", List.of(), Map.of()).kind()).isEqualTo(MatchKind.NOT_FOUND);
    }
}
