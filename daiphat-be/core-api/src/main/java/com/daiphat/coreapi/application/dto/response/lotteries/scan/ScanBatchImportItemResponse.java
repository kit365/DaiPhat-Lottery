package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.ScanImportOutcome;
import lombok.Builder;

/**
 * Per-ticket outcome of a scan batch-import (doc mobile UX: "Display
 * individual import results: Success / Duplicate / Failed"). {@code ticketId}
 * is null unless {@code outcome} is SUCCESS.
 */
@Builder
public record ScanBatchImportItemResponse(
        String numbers,
        String serialNumber,
        ScanImportOutcome outcome,
        String message,
        Long ticketId
) {
}
