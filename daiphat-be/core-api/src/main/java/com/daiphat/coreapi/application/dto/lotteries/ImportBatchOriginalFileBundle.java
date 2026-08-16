package com.daiphat.coreapi.application.dto.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.SettlementImportFileCheckFileResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementImportFileCheckTicketResponse;

import java.util.List;

/**
 * Original supplier uploads for the settlement's import batches, re-parsed for one draw date.
 */
public record ImportBatchOriginalFileBundle(
        List<SettlementImportFileCheckFileResponse> files,
        List<SettlementImportFileCheckTicketResponse> tickets,
        List<StationQuantity> declaredStationQuantities,
        boolean importsTickets
) {

    public record StationQuantity(
            Long lotteryStationId,
            String stationName,
            int quantity
    ) {
    }
}
