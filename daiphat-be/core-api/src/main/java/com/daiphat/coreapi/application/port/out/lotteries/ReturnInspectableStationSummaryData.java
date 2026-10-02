package com.daiphat.coreapi.application.port.out.lotteries;

import java.math.BigDecimal;

public record ReturnInspectableStationSummaryData(
        Long stationId,
        String stationName,
        long eligibleSerialCount,
        BigDecimal totalImportCost
) {
}
