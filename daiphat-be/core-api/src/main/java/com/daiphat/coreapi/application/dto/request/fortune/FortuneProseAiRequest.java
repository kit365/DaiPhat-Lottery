package com.daiphat.coreapi.application.dto.request.fortune;

import java.time.LocalDate;

public record FortuneProseAiRequest(
        String luckyTail,
        String userElement,
        String dayElement,
        int birthYear,
        PreviousCast previousCast,
        boolean fallbackUsed,
        String fallbackReason
) {
    public record PreviousCast(
            LocalDate castDate,
            String luckyTail,
            String userElement
    ) {
    }
}
