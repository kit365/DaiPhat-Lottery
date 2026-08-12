package com.daiphat.coreapi.application.dto.request.lotteries;

/**
 * Confirm the IMPORT_UNIT_PRICE discrepancy detected during System vs Actual matching.
 * Does not mark import/return quantity discrepancies as resolved.
 */
public record ResolveUnitPriceDiscrepancyRequest(
        String note,
        boolean markResolved
) {
}
