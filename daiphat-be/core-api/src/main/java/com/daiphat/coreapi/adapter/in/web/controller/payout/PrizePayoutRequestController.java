package com.daiphat.coreapi.adapter.in.web.controller.payout;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.payout.CreatePrizePayoutRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.application.port.in.payout.PrizePayoutRequestServicePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/prize-payout-requests")
@RequiredArgsConstructor
@Validated
public class PrizePayoutRequestController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final PrizePayoutRequestServicePort prizePayoutRequestServicePort;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PrizePayoutRequestResponse> create(
            @Valid @RequestBody CreatePrizePayoutRequestRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Yêu cầu trả thưởng đã gửi. Vui lòng chờ xử lý 1–3 ngày làm việc.",
                prizePayoutRequestServicePort.create(principal.getId(), request));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PageResponse<PrizePayoutRequestResponse>> getMyRequests(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Lấy danh sách yêu cầu trả thưởng thành công.",
                prizePayoutRequestServicePort.getMyRequests(
                        principal.getId(), page, limit, status, search));
    }

    @GetMapping("/statuses")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EnumOptionResponse>> getStatuses() {
        return ApiResponse.success(
                "Lấy danh sách trạng thái trả thưởng thành công.",
                prizePayoutRequestServicePort.getStatuses());
    }

    @GetMapping("/pending-count")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Long> getPendingCount(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Lấy số yêu cầu trả thưởng đang chờ thành công.",
                prizePayoutRequestServicePort.countPendingByCustomerId(principal.getId()));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PrizePayoutRequestResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        try {
            return ApiResponse.success(
                    "Lấy chi tiết yêu cầu trả thưởng thành công.",
                    prizePayoutRequestServicePort.getById(id, principal.getId()));
        } catch (DomainException ex) {
            if (ex.getErrorCode() == ErrorCode.PRIZE_PAYOUT_NOT_FOUND) {
                return ApiResponse.success("Tham chiếu không còn khả dụng.", null);
            }
            throw ex;
        }
    }

    @PatchMapping(ID_PATH + "/cancel")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PrizePayoutRequestResponse> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Đã hủy yêu cầu trả thưởng.",
                prizePayoutRequestServicePort.cancel(id, principal.getId()));
    }
}
