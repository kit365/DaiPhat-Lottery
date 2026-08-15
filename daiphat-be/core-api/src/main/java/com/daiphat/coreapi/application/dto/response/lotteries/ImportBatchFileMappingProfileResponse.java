package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFileMappingRequest;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * A column mapping remembered for one supplier and one file layout.
 *
 * @param headerSignature fingerprint of the header row this mapping belongs to;
 *                        a supplier that sends two different templates has two
 *                        profiles
 */
@Builder
public record ImportBatchFileMappingProfileResponse(
        Long id,
        Long supplierId,
        String supplierName,
        String headerSignature,
        ImportBatchFileMappingRequest mapping,
        int useCount,
        LocalDateTime lastUsedAt,
        LocalDateTime createdAt
) {
}
