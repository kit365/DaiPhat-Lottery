package com.daiphat.coreapi.adapter.in.web.controller.payout;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.payout.CompletePrizePayoutRequest;
import com.daiphat.coreapi.application.dto.request.payout.CreateStaffPrizePayoutBatchRequest;
import com.daiphat.coreapi.application.dto.request.payout.CreateStaffPrizePayoutRequest;
import com.daiphat.coreapi.application.dto.request.payout.RejectPrizePayoutRequest;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutBatchCreateResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutLookupResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutLookupStationResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutPreviewResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutStaffListResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.port.in.payout.PrizePayoutStaffServicePort;
import com.daiphat.coreapi.shared.util.StorageUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/staff/prize-payout-requests")
@RequiredArgsConstructor
@Validated
public class StaffPrizePayoutController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final PrizePayoutStaffServicePort prizePayoutStaffServicePort;

    @GetMapping
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<PrizePayoutStaffListResponse> getRequests(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ApiResponse.success(
                "Lấy danh sách yêu cầu trả thưởng thành công.",
                prizePayoutStaffServicePort.getRequestsForStaff(
                        page, limit, status, search, principal != null ? principal.getId() : null));
    }

    @GetMapping("/lookup")
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<PrizePayoutLookupResponse> lookup(
            @RequestParam(required = false) String orderCode,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate,
            @RequestParam(required = false) String serialNumber) {
        return ApiResponse.success(
                "Tra cứu vé trả thưởng thành công.",
                prizePayoutStaffServicePort.lookup(orderCode, stationId, drawDate, serialNumber));
    }

    @GetMapping("/lookup-stations")
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<List<PrizePayoutLookupStationResponse>> lookupStations(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate) {
        return ApiResponse.success(
                "Lấy danh sách đài mở thưởng theo ngày thành công.",
                prizePayoutStaffServicePort.listLookupStationsByDrawDate(drawDate));
    }

    @GetMapping("/preview")
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<PrizePayoutPreviewResponse> preview(
            @RequestParam(required = false) Long orderDetailId,
            @RequestParam(required = false) Long serialId,
            @RequestParam(required = false) String serialNumber,
            @RequestParam(required = false) String orderCode) {
        return ApiResponse.success(
                "Xem trước số tiền trả thưởng thành công.",
                prizePayoutStaffServicePort.preview(orderDetailId, serialId, serialNumber, orderCode));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizePayoutRequestResponse> createInPerson(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody CreateStaffPrizePayoutRequest request) {
        return ApiResponse.success(
                "Xác nhận trả thưởng tại quầy thành công.",
                prizePayoutStaffServicePort.createInPerson(principal.getId(), request));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizePayoutBatchCreateResponse> createInPersonBatch(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody CreateStaffPrizePayoutBatchRequest request) {
        return ApiResponse.success(
                "Xác nhận trả thưởng tại quầy thành công.",
                prizePayoutStaffServicePort.createInPersonBatch(principal.getId(), request));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<PrizePayoutRequestResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Lấy chi tiết yêu cầu trả thưởng thành công.",
                prizePayoutStaffServicePort.getByIdForStaff(
                        id, principal != null ? principal.getId() : null));
    }

    @PatchMapping(ID_PATH + "/approve")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizePayoutRequestResponse> approve(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Đã duyệt yêu cầu trả thưởng.",
                prizePayoutStaffServicePort.approve(id, principal.getId()));
    }

    @PatchMapping(ID_PATH + "/complete")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizePayoutRequestResponse> complete(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody CompletePrizePayoutRequest request) {
        return ApiResponse.success(
                "Xác nhận trả thưởng thành công.",
                prizePayoutStaffServicePort.complete(id, principal.getId(), request));
    }

    @PatchMapping(ID_PATH + "/reject")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizePayoutRequestResponse> reject(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody RejectPrizePayoutRequest request) {
        return ApiResponse.success(
                "Đã từ chối yêu cầu trả thưởng.",
                prizePayoutStaffServicePort.reject(id, principal.getId(), request));
    }

    @PostMapping(value = "/transfer-evidence/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<StorageResult> uploadTransferEvidence(@RequestPart("file") MultipartFile file) {
        return ApiResponse.success(
                "Tải ảnh minh chứng chuyển khoản thành công.",
                prizePayoutStaffServicePort.uploadTransferEvidence(StorageUtils.toUploadRequest(file)));
    }

    @PostMapping(value = "/recipient-id/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<StorageResult> uploadRecipientId(@RequestPart("file") MultipartFile file) {
        return ApiResponse.success(
                "Tải ảnh giấy tờ người nhận thành công.",
                prizePayoutStaffServicePort.uploadRecipientIdImage(StorageUtils.toUploadRequest(file)));
    }

    @PostMapping(value = "/confirmation-contract/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<StorageResult> uploadConfirmationContract(@RequestPart("file") MultipartFile file) {
        return ApiResponse.success(
                "Tải hợp đồng xác nhận trả thưởng thành công.",
                prizePayoutStaffServicePort.uploadConfirmationContract(StorageUtils.toUploadRequest(file)));
    }
}
