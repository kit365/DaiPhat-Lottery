package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

@Builder
public record SettlementImportFileCheckTicketResponse(
        Long serialId,
        String serialNumber,
        String numbers,
        Long lotteryStationId,
        String stationName,
        Long importBatchId,
        String importBatchCode,
        String sourceFileName
) {
}
