package com.daiphat.coreapi.adapter.in.web.controller.order;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.order.HandleOrderTicketIncidentRequest;
import com.daiphat.coreapi.application.dto.request.refund.StaffCancelOrderWithRefundRequest;
import com.daiphat.coreapi.application.dto.response.order.HandleOrderTicketIncidentResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.port.in.order.OrderIncidentTicketServicePort;
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
    private final OrderIncidentTicketServicePort orderIncidentTicketServicePort;

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

    @PostMapping("/{orderId}/incident-tickets")
    @PreAuthorize("hasAuthority('order:edit')")
    public ApiResponse<HandleOrderTicketIncidentResponse> handleIncidentTickets(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody HandleOrderTicketIncidentRequest request) {
        return ApiResponse.success(
                "Đã xử lý vé sự cố thành công.",
                orderIncidentTicketServicePort.handleIncidents(orderId, principal.getId(), request));
    }

    @PostMapping("/{orderId}/partial-refund")
    @PreAuthorize("hasAuthority('order:edit')")
    public ApiResponse<RefundRequestResponse> createPartialRefund(
            @PathVariable UUID orderId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody com.daiphat.coreapi.application.dto.request.order.CreatePartialRefundRequest request) {
        
        RefundRequestResponse response = refundRequestStaffServicePort.createPartialRefund(orderId, principal.getId(), request);
        
        String message = response != null 
                ? "Đã tạo yêu cầu hoàn tiền từng phần thành công."
                : "Đã đổi vé thành công. Đơn hàng chuyển sang chờ lấy hàng.";
                
        return ApiResponse.success(message, response);
    }
}
