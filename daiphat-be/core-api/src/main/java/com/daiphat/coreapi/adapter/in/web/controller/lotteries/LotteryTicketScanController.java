package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.BatchImportScannedTicketsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.CorrectOcrScanResultFieldsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.OcrConfirmImportRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrConfirmImportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrScanResultFieldResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrScanResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ScanBatchImportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketScanResponse;
import com.daiphat.coreapi.application.port.in.lotteries.OcrScanResultServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.TicketScanImportServicePort;
import com.daiphat.coreapi.application.service.lotteries.OcrConfirmImportService;
import com.daiphat.coreapi.application.service.lotteries.OcrScanResultFieldService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

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
    private final OcrScanResultServicePort ocrScanResultServicePort;
    private final OcrConfirmImportService ocrConfirmImportService;
    private final OcrScanResultFieldService ocrScanResultFieldService;

    @PostMapping(value = "/scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<TicketScanResponse> scan(
            @RequestParam(required = false) Long importBatchLineId,
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

    @PostMapping("/ocr-confirm-import")
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<OcrConfirmImportResponse> ocrConfirmImport(
            @Valid @RequestBody OcrConfirmImportRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        log.info(
                "REST request to OCR confirm-import mode={} tickets={} by user: {}",
                request.mode(),
                request.tickets() != null ? request.tickets().size() : 0,
                principal.getUsername()
        );
        OcrConfirmImportResponse response = ocrConfirmImportService.confirm(request, principal.getId());
        return ApiResponse.success("Xác nhận nhập vé OCR thành công.", response);
    }

    @GetMapping("/ocr-scan-results")
    @PreAuthorize("hasAnyAuthority('ticket:view', 'ticket:create')")
    public ApiResponse<List<OcrScanResultResponse>> listOcrScanResults(
            @RequestParam(required = false) String scanId,
            @RequestParam(required = false) Long importBatchLineId
    ) {
        return ApiResponse.success(
                "Lấy kết quả OCR thành công.",
                ocrScanResultServicePort.list(scanId, importBatchLineId)
        );
    }

    @GetMapping("/ocr-scan-results/{id}/fields")
    @PreAuthorize("hasAnyAuthority('ticket:view', 'ticket:create')")
    public ApiResponse<List<OcrScanResultFieldResponse>> listOcrScanResultFields(@PathVariable Long id) {
        return ApiResponse.success(
                "Lấy chi tiết trường OCR thành công.",
                ocrScanResultFieldService.listByScanResultId(id)
        );
    }

    @PatchMapping("/ocr-scan-results/{id}/fields")
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<List<OcrScanResultFieldResponse>> correctOcrScanResultFields(
            @PathVariable Long id,
            @Valid @RequestBody CorrectOcrScanResultFieldsRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Cập nhật chỉnh sửa trường OCR thành công.",
                ocrScanResultFieldService.correctFields(id, request, principal.getId())
        );
    }
}
