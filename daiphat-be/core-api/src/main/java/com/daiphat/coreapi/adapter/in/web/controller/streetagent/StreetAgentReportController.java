package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.document.SpreadsheetDocument;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentReportResponse;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentReportServicePort;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/street-agent-reports")
@RequiredArgsConstructor
public class StreetAgentReportController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";

    private final StreetAgentReportServicePort streetAgentReportServicePort;

    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('dashboard:analytics')")
    public ApiResponse<StreetAgentReportResponse.Overview> getOverview(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) DailySalesReportStatus status) {
        return ApiResponse.success(null, streetAgentReportServicePort.getOverview(from, to, status));
    }

    @GetMapping("/agents")
    @PreAuthorize("hasAuthority('dashboard:analytics')")
    public ApiResponse<PageResponse<StreetAgentReportResponse.Agent>> getAgents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) DailySalesReportStatus status,
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction) {
        return ApiResponse.success(null, streetAgentReportServicePort.getAgents(
                from, to, status, page, size, sortBy, direction));
    }

    @GetMapping("/stations")
    @PreAuthorize("hasAuthority('dashboard:analytics')")
    public ApiResponse<PageResponse<StreetAgentReportResponse.Station>> getStations(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) DailySalesReportStatus status,
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction) {
        return ApiResponse.success(null, streetAgentReportServicePort.getStations(
                from, to, status, page, size, sortBy, direction));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('dashboard:analytics')")
    public ResponseEntity<byte[]> export(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) DailySalesReportStatus status) {
        SpreadsheetDocument document = streetAgentReportServicePort.export(from, to, status);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.fileName() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(document.content());
    }
}
