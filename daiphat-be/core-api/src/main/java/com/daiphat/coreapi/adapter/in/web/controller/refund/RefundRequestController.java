package com.daiphat.coreapi.adapter.in.web.controller.refund;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.refund.CreateRefundRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.port.in.refund.RefundRequestServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/refund-requests")
@RequiredArgsConstructor
@Validated
public class RefundRequestController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final RefundRequestServicePort refundRequestServicePort;

    @PostMapping
    @PreAuthorize("hasAuthority('" + RoleConstants.ROLE_MEMBER + "')")
    public ApiResponse<RefundRequestResponse> create(
            @Valid @RequestBody CreateRefundRequestRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Tạo yêu cầu hoàn tiền thành công.",
                refundRequestServicePort.create(principal.getId(), request));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('" + RoleConstants.ROLE_MEMBER + "')")
    public ApiResponse<PageResponse<RefundRequestResponse>> getMyRequests(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID orderId,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Lấy danh sách yêu cầu hoàn tiền của bạn thành công.",
                refundRequestServicePort.getMyRequests(
                        principal.getId(), page, limit, status, orderId, search));
    }

    @GetMapping("/statuses")
    @PreAuthorize("hasAuthority('" + RoleConstants.ROLE_MEMBER + "')")
    public ApiResponse<List<EnumOptionResponse>> getStatuses() {
        return ApiResponse.success(
                "Lấy danh sách trạng thái hoàn tiền thành công.",
                refundRequestServicePort.getRefundRequestStatuses());
    }

    @GetMapping("/types")
    @PreAuthorize("hasAuthority('" + RoleConstants.ROLE_MEMBER + "')")
    public ApiResponse<List<EnumOptionResponse>> getTypes() {
        return ApiResponse.success(
                "Lấy danh sách loại hoàn tiền thành công.",
                refundRequestServicePort.getRefundTypes());
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAuthority('" + RoleConstants.ROLE_MEMBER + "')")
    public ApiResponse<RefundRequestResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Lấy chi tiết yêu cầu hoàn tiền thành công.",
                refundRequestServicePort.getById(id, principal.getId()));
    }

    @PatchMapping(ID_PATH + "/cancel")
    @PreAuthorize("hasAuthority('" + RoleConstants.ROLE_MEMBER + "')")
    public ApiResponse<RefundRequestResponse> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Hủy yêu cầu hoàn tiền thành công.",
                refundRequestServicePort.cancel(id, principal.getId()));
    }
}
