package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.util.List;

@Builder
public record ImportBatchFileImportResultResponse(
        /** History row for this run; null when the run could not be recorded. */
        Long jobId,
        int requestedCount,
        int createdCount,
        int failedCount,
        List<ImportBatchFileImportItemResultResponse> items
) {
}
