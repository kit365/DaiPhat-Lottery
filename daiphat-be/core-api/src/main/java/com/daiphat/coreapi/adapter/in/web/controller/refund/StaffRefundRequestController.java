package com.daiphat.coreapi.adapter.in.web.controller.refund;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.refund.RejectRefundRequestRequest;
import com.daiphat.coreapi.application.dto.request.refund.TransferRefundRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestAdminDetailResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.port.in.refund.RefundRequestStaffServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/staff/refund-requests")
@RequiredArgsConstructor
@Validated
public class StaffRefundRequestController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final RefundRequestStaffServicePort refundRequestStaffServicePort;

    @GetMapping
    @PreAuthorize("hasAuthority('refund:view')")
    public ApiResponse<PageResponse<RefundRequestResponse>> getRefundRequests(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID orderId,
            @RequestParam(required = false) String search) {
        return ApiResponse.success(
                "Lấy danh sách yêu cầu hoàn tiền thành công.",
                refundRequestStaffServicePort.getRequestsForStaff(page, limit, status, orderId, search));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAuthority('refund:view')")
    public ApiResponse<RefundRequestAdminDetailResponse> getRefundRequestById(@PathVariable Long id) {
        return ApiResponse.success(
                "Lấy chi tiết yêu cầu hoàn tiền thành công.",
                refundRequestStaffServicePort.getByIdForStaff(id));
    }

    @PatchMapping(ID_PATH + "/approve")
    @PreAuthorize("hasAuthority('refund:approve')")
    public ApiResponse<RefundRequestResponse> approve(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Duyệt yêu cầu hoàn tiền thành công.",
                refundRequestStaffServicePort.approve(id, principal.getId()));
    }

    @PatchMapping(ID_PATH + "/reject")
    @PreAuthorize("hasAuthority('refund:reject')")
    public ApiResponse<RefundRequestResponse> reject(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody RejectRefundRequestRequest request) {
        return ApiResponse.success(
                "Đã từ chối yêu cầu hủy.",
                refundRequestStaffServicePort.reject(id, principal.getId(), request));
    }

    @PatchMapping(ID_PATH + "/transfer")
    @PreAuthorize("hasAuthority('refund:process')")
    public ApiResponse<RefundRequestResponse> transfer(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody TransferRefundRequestRequest request) {
        return ApiResponse.success(
                "Xác nhận chuyển khoản hoàn tiền thành công.",
                refundRequestStaffServicePort.markTransferred(id, principal.getId(), request));
    }
}
