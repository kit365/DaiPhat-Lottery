package com.daiphat.coreapi.adapter.in.web.controller.order;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.refund.StaffCancelOrderWithRefundRequest;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.port.in.refund.RefundRequestStaffServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/staff/orders")
@RequiredArgsConstructor
@Validated
public class StaffOrderCancelWithRefundController {

    private final RefundRequestStaffServicePort refundRequestStaffServicePort;

    @PostMapping("/{orderId}/cancel-with-refund")
    @PreAuthorize("hasAuthority('refund:process')")
    public ApiResponse<RefundRequestResponse> cancelOrderWithRefund(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody StaffCancelOrderWithRefundRequest request) {
        return ApiResponse.success(
                "Đã hủy đơn và tạo yêu cầu hoàn tiền chờ thông tin STK.",
                refundRequestStaffServicePort.cancelOrderWithRefund(orderId, principal.getId(), request));
    }
}
