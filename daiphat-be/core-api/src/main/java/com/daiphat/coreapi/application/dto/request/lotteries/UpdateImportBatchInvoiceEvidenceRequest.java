package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;

/**
 * Attach (or replace only when missing) invoice evidence URL on an import batch.
 */
public record UpdateImportBatchInvoiceEvidenceRequest(
        @NotBlank String invoiceEvidenceUrl
) {
}
