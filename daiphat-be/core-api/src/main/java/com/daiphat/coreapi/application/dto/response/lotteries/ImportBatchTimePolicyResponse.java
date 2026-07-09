package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

@Builder
public record ImportBatchTimePolicyResponse(
        String lateImportTime,
        String importBatchCutoffTime
) {
}
