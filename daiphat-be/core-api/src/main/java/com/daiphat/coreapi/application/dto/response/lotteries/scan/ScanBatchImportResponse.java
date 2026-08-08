package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import lombok.Builder;

import java.util.List;

/**
 * Response of POST /lottery-tickets/batch-import. Each confirmed ticket is
 * imported independently (own success/duplicate/failure), so one bad
 * ticket never blocks the rest of the batch -- see
 * TicketScanImportService#batchImport.
 */
@Builder
public record ScanBatchImportResponse(
        Long importBatchLineId,
        int totalRequested,
        int successCount,
        int duplicateCount,
        int failedCount,
        List<ScanBatchImportItemResponse> results
) {
}
