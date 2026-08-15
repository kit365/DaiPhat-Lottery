package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFileMappingRequest;
import lombok.Builder;

import java.util.List;
import java.util.Map;

/**
 * First step of the wizard: what the file looks like and how the columns are
 * likely to map, before anything is resolved.
 *
 * @param profileMatched true when a saved mapping profile for this supplier and
 *                       header layout was applied, so the UI can say so instead
 *                       of making the user re-map familiar columns
 */
@Builder
public record ImportBatchFileInspectResponse(
        List<String> detectedHeaders,
        List<Map<String, String>> sampleRows,
        int totalRows,
        String fileHash,
        String headerSignature,
        boolean profileMatched,
        ImportBatchFileMappingRequest suggestedMapping
) {
}
