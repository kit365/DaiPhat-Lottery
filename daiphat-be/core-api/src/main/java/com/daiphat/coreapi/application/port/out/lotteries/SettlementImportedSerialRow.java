package com.daiphat.coreapi.application.port.out.lotteries;

public record SettlementImportedSerialRow(
        Long serialId,
        String serialNumber,
        String numbers,
        Long lotteryStationId,
        String stationName,
        Long importBatchId,
        String importBatchCode
) {
}
