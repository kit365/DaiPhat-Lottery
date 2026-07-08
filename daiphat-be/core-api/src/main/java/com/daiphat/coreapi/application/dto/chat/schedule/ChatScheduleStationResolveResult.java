package com.daiphat.coreapi.application.dto.chat.schedule;

import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;

import java.util.List;
import java.util.Optional;

public sealed interface ChatScheduleStationResolveResult {

    record Single(ChatScheduleStationMatchResult match) implements ChatScheduleStationResolveResult {
    }

    record Multiple(List<ChatScheduleStationMatchResult> matches) implements ChatScheduleStationResolveResult {
    }

    record Ambiguous(List<ChatScheduleFuzzyCandidate> candidates) implements ChatScheduleStationResolveResult {
    }

    record None() implements ChatScheduleStationResolveResult {
        public static final None INSTANCE = new None();
    }

    default Optional<ChatScheduleStationMatchResult> toOptionalSingle() {
        return switch (this) {
            case Single single -> Optional.of(single.match());
            case Multiple multiple when !multiple.matches().isEmpty() ->
                    Optional.of(multiple.matches().getFirst());
            default -> Optional.empty();
        };
    }

    default List<LotteryStationModel> stations() {
        return switch (this) {
            case Single single -> List.of(single.match().station());
            case Multiple multiple -> multiple.matches().stream()
                    .map(ChatScheduleStationMatchResult::station)
                    .toList();
            case Ambiguous ambiguous -> ambiguous.candidates().stream()
                    .map(ChatScheduleFuzzyCandidate::station)
                    .toList();
            case None ignored -> List.of();
        };
    }

    default boolean isAmbiguous() {
        return this instanceof Ambiguous;
    }
}
