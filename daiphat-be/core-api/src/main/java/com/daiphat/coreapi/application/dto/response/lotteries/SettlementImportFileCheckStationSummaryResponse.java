package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

@Builder
public record SettlementImportFileCheckStationSummaryResponse(
        Long lotteryStationId,
        String stationName,
        int fileQty,
        int systemQty,
        int onlyInSystemQty,
        int onlyInFileQty
) {
}
