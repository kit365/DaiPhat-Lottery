package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import lombok.Builder;

import java.time.LocalDate;

@Builder
public record AiModelMetricResponse(
        Long id,
        Long modelId,
        LocalDate metricDate,
        String fieldName,
        long totalFields,
        long correctedFields,
        Double avgAiConfidence,
        Double correctionRate
) {}
