package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import lombok.Builder;

import java.time.LocalDate;
import java.util.Map;

@Builder
public record CreateTrainingDatasetExportRequest(
        Long usedForModelId,
        LocalDate fromDate,
        LocalDate toDate,
        Boolean correctedOnly,
        Map<String, Object> extraFilters
) {}
