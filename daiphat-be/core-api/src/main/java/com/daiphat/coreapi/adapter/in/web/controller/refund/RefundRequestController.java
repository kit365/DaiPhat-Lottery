package com.daiphat.coreapi.adapter.in.web.controller.refund;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.refund.CreateRefundRequestRequest;
import com.daiphat.coreapi.application.dto.request.refund.RejectRefundRequestRequest;
import com.daiphat.coreapi.application.dto.request.refund.TransferRefundRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.port.in.refund.RefundRequestServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
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
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_MEMBER + "', '" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<RefundRequestResponse> create(
            @Valid @RequestBody CreateRefundRequestRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Tạo yêu cầu hoàn tiền thành công.",
                refundRequestServicePort.create(principal.getId(), request));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
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

    @GetMapping
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<PageResponse<RefundRequestResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID orderId,
            @RequestParam(required = false) String search) {
        return ApiResponse.success(
                "Lấy danh sách yêu cầu hoàn tiền thành công.",
                refundRequestServicePort.getAll(page, limit, status, orderId, search));
    }

    @GetMapping("/statuses")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EnumOptionResponse>> getStatuses() {
        return ApiResponse.success(
                "Lấy danh sách trạng thái hoàn tiền thành công.",
                refundRequestServicePort.getRefundRequestStatuses());
    }

    @GetMapping("/types")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EnumOptionResponse>> getTypes() {
        return ApiResponse.success(
                "Lấy danh sách loại hoàn tiền thành công.",
                refundRequestServicePort.getRefundTypes());
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<RefundRequestResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        boolean staffAccess = hasStaffAccess(principal);
        return ApiResponse.success(
                "Lấy chi tiết yêu cầu hoàn tiền thành công.",
                refundRequestServicePort.getById(id, principal.getId(), staffAccess));
    }

    @PatchMapping(ID_PATH + "/approve")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<RefundRequestResponse> approve(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Duyệt yêu cầu hoàn tiền thành công.",
                refundRequestServicePort.approve(id, principal.getId()));
    }

    @PatchMapping(ID_PATH + "/reject")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<RefundRequestResponse> reject(
            @PathVariable Long id,
            @Valid @RequestBody RejectRefundRequestRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Từ chối yêu cầu hoàn tiền thành công.",
                refundRequestServicePort.reject(id, principal.getId(), request));
    }

    @PatchMapping(ID_PATH + "/transfer")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<RefundRequestResponse> markTransferred(
            @PathVariable Long id,
            @Valid @RequestBody TransferRefundRequestRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Xác nhận chuyển khoản hoàn tiền thành công.",
                refundRequestServicePort.markTransferred(id, principal.getId(), request));
    }

    private static boolean hasStaffAccess(AuthenticatedUserPrincipal principal) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(auth -> RoleConstants.ROLE_STAFF_OPERATOR.equals(auth)
                        || RoleConstants.ADMIN.equals(auth));
    }
}
