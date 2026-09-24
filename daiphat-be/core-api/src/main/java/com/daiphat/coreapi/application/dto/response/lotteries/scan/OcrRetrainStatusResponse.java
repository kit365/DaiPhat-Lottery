package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record OcrRetrainStatusResponse(
        boolean retrainSuggested,
        LocalDate fromDate,
        LocalDate toDate,
        long totalFields,
        long correctedFields,
        Double correctionRate,
        double correctionRateThreshold,
        long minCorrectedFields,
        String reason,
        List<FieldHotspot> fieldHotspots
) {
    @Builder
    public record FieldHotspot(
            String fieldName,
            long totalFields,
            long correctedFields,
            Double correctionRate
    ) {}
}
