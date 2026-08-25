package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrConfirmImportMode;
import lombok.Builder;

import java.util.List;

@Builder
public record OcrConfirmImportResponse(
        OcrConfirmImportMode mode,
        int totalRequested,
        int successCount,
        int duplicateCount,
        int failedCount,
        List<OcrConfirmImportBatchResult> batches
) {
}
