package com.daiphat.coreapi.application.dto.response.fortune;

import java.time.LocalDate;

public record FortuneCastResponse(
        String luckyTail,
        String primaryTail,
        boolean fallbackUsed,
        String fallbackReason,
        String userElement,
        String dayElement,
        String prose,
        String proseSource,
        LocalDate castDate,
        LocalDate sellableDrawDate,
        String buyPath,
        boolean alreadyCastToday,
        PreviousCastSummary previousCastSummary
) {
    public record PreviousCastSummary(
            LocalDate castDate,
            String luckyTail,
            String userElement
    ) {
    }
}
