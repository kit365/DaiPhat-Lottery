package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.util.List;

@Builder
public record SupplierSettlementOverviewResponse(
        SupplierSettlementResponse settlement,
        SupplierSettlementKpisResponse kpis,
        List<ImportBatchResponse> importBatches,
        List<ReturnBatchResponse> returnBatches,
        List<SettlementStationInventoryResponse> inventoryByStation,
        List<SettlementStationPricingResponse> stationPricing,
        List<SupplierSettlementAdjustmentResponse> adjustments
) {
}
