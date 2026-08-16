package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFileMappingRequest;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

/**
 * Everything the preview step needs to render, without anything having been written.
 *
 * @param appliedMapping the mapping actually used, including auto-detected values,
 *                       so the client can show it and store it as a profile
 * @param fileHash       sha-256 of the upload; echoed back on commit for idempotency
 * @param windowFrom     first importable draw date (today)
 * @param windowTo       last importable draw date (tomorrow)
 * @param importsTickets true when the file carries the tickets themselves, not
 *                       just the declared quantities
 */
@Builder
public record ImportBatchFilePreviewResponse(
        ImportBatchFileMappingRequest appliedMapping,
        List<String> detectedHeaders,
        String fileHash,
        LocalDate windowFrom,
        LocalDate windowTo,
        boolean importsTickets,
        int totalRows,
        int importableRows,
        int skippedRows,
        int errorRows,
        List<ImportBatchFileGroupResponse> groups
) {
}
