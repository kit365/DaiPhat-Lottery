package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import lombok.Builder;

import java.util.List;

@Builder
public record ImportBatchClassificationPreviewResponse(
        ImportBatchType requestedBatchType,
        ImportBatchType resolvedBatchType,
        boolean lateImportWarning,
        List<String> warnings
) {
}
