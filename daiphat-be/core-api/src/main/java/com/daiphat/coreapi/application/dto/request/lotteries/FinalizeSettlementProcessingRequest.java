package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;

/**
 * All discrepancy drafts submitted together when the user completes processing.
 * Keeping this as one request lets the service persist every resolution and the
 * status transition in one transaction.
 */
public record FinalizeSettlementProcessingRequest(
        @Valid ResolveImportDiscrepancyRequest importResolution,
        @Valid ResolveReturnDiscrepancyRequest returnResolution,
        @Valid ResolveUnitPriceDiscrepancyRequest unitPriceResolution,
        String reconciliationNote
) {
}
