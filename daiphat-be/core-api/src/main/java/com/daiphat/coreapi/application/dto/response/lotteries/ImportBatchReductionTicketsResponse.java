package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.util.List;

@Builder
public record ImportBatchReductionTicketsResponse(
        Integer totalImportedQuantity,
        Integer removableImportedQuantity,
        List<ImportBatchReductionLineResponse> lines
) {
}
