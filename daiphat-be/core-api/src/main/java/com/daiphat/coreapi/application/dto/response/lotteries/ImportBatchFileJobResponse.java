package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileJobStatus;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * One row of the file-import history: who uploaded what, when, and what came of it.
 *
 * @param originalFileUrl the supplier's upload, kept as settlement evidence
 */
@Builder
public record ImportBatchFileJobResponse(
        Long id,
        String fileName,
        String fileHash,
        String originalFileUrl,
        Long supplierId,
        String supplierName,
        ImportBatchFileJobStatus status,
        String statusLabel,
        boolean importsTickets,
        String requestedDrawDates,
        int requestedCount,
        int createdCount,
        int failedCount,
        int declaredQuantity,
        int importedQuantity,
        String errorCode,
        String errorMessage,
        LocalDateTime startedAt,
        LocalDateTime finishedAt
) {
}
