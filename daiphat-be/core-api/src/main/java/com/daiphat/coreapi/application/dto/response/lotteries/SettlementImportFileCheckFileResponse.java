package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SettlementImportFileCheckStatus;
import lombok.Builder;

@Builder
public record SettlementImportFileCheckFileResponse(
        Long importBatchId,
        String importBatchCode,
        String fileName,
        String originalFileUrl,
        SettlementImportFileCheckStatus status,
        String errorMessage
) {
}
