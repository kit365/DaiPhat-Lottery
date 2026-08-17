package com.daiphat.coreapi.application.dto.document;

import java.util.List;

/** Formatted values for the printable supplier-settlement reconciliation report. */
public record SupplierSettlementReconciliationReportTemplateData(
        String siteName,
        String siteLogoUrl,
        String siteAddress,
        String sitePhone,
        String siteEmail,
        String reportCode,
        String issuedDate,
        String supplierName,
        String supplierCode,
        String settlementCode,
        String periodLabel,
        String statusLabel,
        String phaseLabel,
        String importQtySystem,
        String importQtyActual,
        String importQtyDiff,
        String returnQtySystem,
        String returnQtyActual,
        String returnQtyDiff,
        String importValueSystem,
        String importValueActual,
        String importValueDiff,
        String returnValueSystem,
        String returnValueActual,
        String returnValueDiff,
        String initialEstimatedValue,
        String finalSettlementValue,
        String settlementDifferenceAmount,
        String actualPaidAmount,
        String remainingDifference,
        String paymentEvidenceCount,
        boolean completed,
        List<LotLine> importLots,
        List<LotLine> returnLots,
        List<StationLine> stations,
        List<AdjustmentLine> adjustments
) {
    public record LotLine(
            String code,
            String drawDate,
            String statusLabel,
            String quantity,
            String unitPrice,
            String amount
    ) {
    }

    public record StationLine(
            String stationName,
            String importedQuantity,
            String importCost,
            String commissionRate,
            String netUnitPrice
    ) {
    }

    public record AdjustmentLine(
            String name,
            String note,
            String amount
    ) {
    }
}
