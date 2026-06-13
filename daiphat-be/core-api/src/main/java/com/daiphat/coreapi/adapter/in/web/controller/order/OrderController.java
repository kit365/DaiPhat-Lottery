package com.daiphat.coreapi.adapter.in.web.controller.order;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.port.in.order.OrderEnumServicePort;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/orders")
@RequiredArgsConstructor
@Validated
@Slf4j
public class OrderController {

    private final OrderServicePort orderServicePort;
    private final OrderEnumServicePort orderEnumServicePort;
    private final OrderApplicationMapper orderApplicationMapper;

    @PostMapping("/online")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_MEMBER + "', '" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<OrderResponse> createOnlineOrder(
            @Valid @RequestBody CreateOnlineOrderRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to create online order by user: {}", principal.getId());
        OrderModel order = orderServicePort.createOnlineOrder(request, principal.getId());
        return ApiResponse.success("Tạo đơn hàng online thành công.", orderApplicationMapper.toResponse(order));
    }

    @PostMapping("/direct")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<OrderResponse> createDirectOrder(
            @Valid @RequestBody CreateDirectOrderRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to create direct order by staff: {}", principal.getId());
        OrderModel order = orderServicePort.createDirectOrder(request, principal.getId());
        return ApiResponse.success("Tạo đơn hàng tại quầy thành công.", orderApplicationMapper.toResponse(order));
    }

    @GetMapping("/types")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EnumOptionResponse>> getOrderTypes() {
        return ApiResponse.success("Lấy danh sách loại đơn hàng thành công.", orderEnumServicePort.getOrderTypes());
    }

    @GetMapping("/statuses")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EnumOptionResponse>> getOrderStatuses() {
        return ApiResponse.success("Lấy danh sách trạng thái đơn hàng thành công.", orderEnumServicePort.getOrderStatuses());
    }

    @GetMapping("/receive-types")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EnumOptionResponse>> getOrderReceiveTypes() {
        return ApiResponse.success("Lấy danh sách hình thức nhận vé thành công.", orderEnumServicePort.getOrderReceiveTypes());
    }

    @GetMapping("/detail-statuses")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EnumOptionResponse>> getOrderDetailStatuses() {
        return ApiResponse.success("Lấy danh sách trạng thái chi tiết đơn hàng thành công.", orderEnumServicePort.getOrderDetailStatuses());
    }

    @GetMapping("/refund-statuses")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EnumOptionResponse>> getOrderRefundStatuses() {
        return ApiResponse.success("Lấy danh sách trạng thái hoàn tiền thành công.", orderEnumServicePort.getOrderRefundStatuses());
    }
}
