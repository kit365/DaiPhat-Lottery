package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.application.dto.document.SpreadsheetDocument;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentReportResponse;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;

import java.time.LocalDate;

public interface StreetAgentReportServicePort {
    StreetAgentReportResponse.Overview getOverview(LocalDate from, LocalDate to, DailySalesReportStatus status);

    PageResponse<StreetAgentReportResponse.Agent> getAgents(
            LocalDate from, LocalDate to, DailySalesReportStatus status, int page, int size, String sortBy, String direction);

    PageResponse<StreetAgentReportResponse.Station> getStations(
            LocalDate from, LocalDate to, DailySalesReportStatus status, int page, int size, String sortBy, String direction);

    SpreadsheetDocument export(LocalDate from, LocalDate to, DailySalesReportStatus status);
}
