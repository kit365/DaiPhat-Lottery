package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.BatchImportScannedTicketsRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ScanBatchImportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketScanResponse;
import com.daiphat.coreapi.application.port.in.lotteries.TicketScanImportServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Camera ticket-scan feature (DP-269, doc section 4 Flow 4). Kept separate
 * from LotteryTicketController (manual entry / bulk-import) since it's a
 * distinct concern -- both ultimately persist through the same
 * LotteryTicketServicePort#create.
 */
@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-tickets")
@RequiredArgsConstructor
@Validated
@Slf4j
public class LotteryTicketScanController {

    private final TicketScanImportServicePort ticketScanImportServicePort;

    @PostMapping(value = "/scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<TicketScanResponse> scan(
            @RequestParam Long importBatchLineId,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        log.info(
                "REST request to scan ticket image for import batch line {} by user: {}",
                importBatchLineId, principal.getUsername()
        );
        TicketScanResponse response = ticketScanImportServicePort.scan(importBatchLineId, file, principal.getId());
        return ApiResponse.success("Quét vé thành công.", response);
    }

    @PostMapping("/batch-import")
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<ScanBatchImportResponse> batchImport(
            @Valid @RequestBody BatchImportScannedTicketsRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        log.info(
                "REST request to batch-import {} scanned ticket(s) for import batch line {} by user: {}",
                request.tickets().size(), request.importBatchLineId(), principal.getUsername()
        );
        ScanBatchImportResponse response = ticketScanImportServicePort.batchImport(request, principal.getId());
        return ApiResponse.success("Nhập kho vé quét thành công.", response);
    }
}
