package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scanlog.LotteryScanLogResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryScanLogServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Read-only reporting over Lottery_Scan_Log (doc rationale: kept out of a
 * general Audit_Log specifically so this kind of query stays fast). Writes
 * happen as a side effect of the scan/import flow itself
 * ({@link com.daiphat.coreapi.application.service.lotteries.TicketScanImportService}),
 * not through this controller.
 */
@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-tickets/scan-logs")
@RequiredArgsConstructor
@Validated
@Slf4j
public class LotteryScanLogController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "20";

    private final LotteryScanLogServicePort lotteryScanLogServicePort;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<PageResponse<LotteryScanLogResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) ScanEventType eventType,
            @RequestParam(required = false) Long lotteryTicketSerialId,
            @RequestParam(required = false) UUID scannedBy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate scannedAtFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate scannedAtTo,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction
    ) {
        PageResponse<LotteryScanLogResponse> response = lotteryScanLogServicePort.getAll(
                page, size, eventType, lotteryTicketSerialId, scannedBy, scannedAtFrom, scannedAtTo, sortBy, direction
        );
        return ApiResponse.success("Lấy lịch sử quét vé thành công.", response);
    }
}
