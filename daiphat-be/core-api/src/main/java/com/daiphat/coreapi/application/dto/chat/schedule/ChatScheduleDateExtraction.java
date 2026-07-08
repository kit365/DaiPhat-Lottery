package com.daiphat.coreapi.application.dto.chat.schedule;

import com.daiphat.coreapi.domain.model.enums.chat.ChatScheduleDateMode;

import java.time.LocalDate;
import java.util.Optional;

public record ChatScheduleDateExtraction(
        ChatScheduleDateMode mode,
        LocalDate date,
        boolean invalidDateAttempt,
        boolean missingYearClarification
) {

    public static ChatScheduleDateExtraction allDays() {
        return new ChatScheduleDateExtraction(ChatScheduleDateMode.ALL_DAYS, null, false, false);
    }

    public static ChatScheduleDateExtraction specific(LocalDate date) {
        return new ChatScheduleDateExtraction(ChatScheduleDateMode.SPECIFIC_DATE, date, false, false);
    }

    public static ChatScheduleDateExtraction today() {
        return new ChatScheduleDateExtraction(ChatScheduleDateMode.TODAY, LocalDate.now(), false, false);
    }

    public static ChatScheduleDateExtraction tomorrow() {
        return new ChatScheduleDateExtraction(ChatScheduleDateMode.TOMORROW, LocalDate.now().plusDays(1), false, false);
    }

    public static ChatScheduleDateExtraction invalid() {
        return new ChatScheduleDateExtraction(null, null, true, false);
    }

    public static ChatScheduleDateExtraction missingYear() {
        return new ChatScheduleDateExtraction(null, null, false, true);
    }

    public static ChatScheduleDateExtraction empty() {
        return new ChatScheduleDateExtraction(null, null, false, false);
    }

    public Optional<LocalDate> resolvedDate() {
        if (mode == null) {
            return Optional.empty();
        }
        return switch (mode) {
            case TODAY -> Optional.of(LocalDate.now());
            case TOMORROW -> Optional.of(LocalDate.now().plusDays(1));
            case SPECIFIC_DATE -> Optional.ofNullable(date);
            case ALL_DAYS -> Optional.empty();
        };
    }

    public boolean isPresent() {
        return mode != null;
    }
}
