package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.Map;

@Builder
public record TrainingDatasetExportResponse(
        Long id,
        Map<String, Object> filterJson,
        String filePath,
        long rowCount,
        String status,
        Long usedForModelId,
        String errorMessage,
        LocalDateTime exportedAt,
        LocalDateTime createdAt
) {}
