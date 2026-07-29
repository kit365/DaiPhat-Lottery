package com.daiphat.coreapi.adapter.in.web.controller.payout;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.payout.CompletePrizePayoutRequest;
import com.daiphat.coreapi.application.dto.request.payout.RejectPrizePayoutRequest;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutStaffListResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.port.in.payout.PrizePayoutStaffServicePort;
import com.daiphat.coreapi.shared.util.StorageUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

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
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ApiResponse.success(
                "Lấy danh sách yêu cầu trả thưởng thành công.",
                prizePayoutStaffServicePort.getRequestsForStaff(page, limit, status, search));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAuthority('prizePayout:view')")
    public ApiResponse<PrizePayoutRequestResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(
                "Lấy chi tiết yêu cầu trả thưởng thành công.",
                prizePayoutStaffServicePort.getByIdForStaff(id));
    }

    @PatchMapping(ID_PATH + "/complete")
    @PreAuthorize("hasAuthority('prizePayout:process')")
    public ApiResponse<PrizePayoutRequestResponse> complete(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody CompletePrizePayoutRequest request) {
        return ApiResponse.success(
                "Xác nhận chuyển khoản trả thưởng thành công.",
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
}
