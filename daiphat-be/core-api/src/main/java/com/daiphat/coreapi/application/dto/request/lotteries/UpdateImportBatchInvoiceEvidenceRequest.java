package com.daiphat.coreapi.application.dto.request.lotteries;

/**
 * Attach invoice evidence URL on an import batch, or clear it when blank/null
 * (used by settlement matching to replace a previously uploaded receipt).
 */
public record UpdateImportBatchInvoiceEvidenceRequest(
        String invoiceEvidenceUrl
) {
}
