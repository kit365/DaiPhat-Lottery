package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record OcrConfirmImportBatchResult(
        Long importBatchId,
        String batchCode,
        LocalDate drawDate,
        int ticketSuccessCount,
        int ticketDuplicateCount,
        int ticketFailedCount,
        List<ScanBatchImportItemResponse> ticketResults
) {
}
