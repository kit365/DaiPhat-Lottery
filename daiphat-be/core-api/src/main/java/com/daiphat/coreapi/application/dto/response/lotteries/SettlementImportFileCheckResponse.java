package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.util.List;

@Builder
public record SettlementImportFileCheckResponse(
        List<SettlementImportFileCheckFileResponse> files,
        List<SettlementImportFileCheckTicketResponse> fileTickets,
        List<SettlementImportFileCheckTicketResponse> systemTickets,
        int matchedCount,
        List<SettlementImportFileCheckTicketResponse> onlyInSystem,
        List<SettlementImportFileCheckTicketResponse> onlyInFile,
        List<SettlementImportFileCheckStationSummaryResponse> stationSummaries,
        boolean importsTickets
) {
}
