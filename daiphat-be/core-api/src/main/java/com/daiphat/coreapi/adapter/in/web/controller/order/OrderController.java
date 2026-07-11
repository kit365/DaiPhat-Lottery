package com.daiphat.coreapi.adapter.in.web.controller.order;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.refund.CreateOrderRefundRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.UpdateOrderStatusRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.application.dto.response.refund.OrderRefundEligibilityResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
import com.daiphat.coreapi.application.port.in.refund.OrderRefundServicePort;
import com.daiphat.coreapi.application.dto.response.notification.NotificationReferenceAvailabilityResponse;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.shared.util.SearchConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/orders")
@RequiredArgsConstructor
@Validated
@Slf4j
public class OrderController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_SIZE = "10";
    private static final String DEFAULT_SORT_BY = SearchConstants.DEFAULT_SORT_BY;
    private static final String DEFAULT_SORT_DIRECTION = SearchConstants.DEFAULT_SORT_DIRECTION;

    private final OrderServicePort orderServicePort;
    private final OrderApplicationMapper orderApplicationMapper;
    private final OrderRefundServicePort orderRefundServicePort;

    @PostMapping("/online")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_MEMBER + "', 'order:create')")
    public ApiResponse<OrderResponse> createOnlineOrder(
            @Valid @RequestBody CreateOnlineOrderRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to create online order by user: {}", principal.getId());
        OrderModel order = orderServicePort.createOnlineOrder(request, principal.getId());
        return ApiResponse.success("Tạo đơn hàng online thành công.", orderApplicationMapper.toResponse(order));
    }

    @PostMapping("/direct")
    @PreAuthorize("hasAuthority('order:create')")
    public ApiResponse<OrderResponse> createDirectOrder(
            @Valid @RequestBody CreateDirectOrderRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to create direct order by staff: {}", principal.getId());
        OrderModel order = orderServicePort.createDirectOrder(request, principal.getId());
        return ApiResponse.success("Tạo đơn hàng tại quầy thành công.", orderApplicationMapper.toResponse(order));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('order:view')")
    public ApiResponse<OrderResponse> getOrderDetail(@PathVariable java.util.UUID id) {
        log.info("REST request to get order detail: {}", id);
        return ApiResponse.success(
                "Lấy chi tiết đơn hàng thành công.",
                orderServicePort.getOrderDetail(id)
        );
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('order:edit')")
    public ApiResponse<OrderResponse> updateOrderStatus(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody UpdateOrderStatusRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to update order {} status to {} by user {}", id, request.status(), principal.getId());
        return ApiResponse.success(
                "Cập nhật trạng thái đơn hàng thành công.",
                orderServicePort.updateOrderStatus(id, request.status(), request.reason(), principal.getId())
        );
    }

    @GetMapping
    @PreAuthorize("hasAuthority('order:view')")
    public ApiResponse<PageResponse<OrderResponse>> getOrders(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_SIZE) int size,
            @RequestParam(required = false) List<String> status,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) List<String> orderType,
            @RequestParam(required = false) List<String> receiveType,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = DEFAULT_SORT_BY) String sortBy,
            @RequestParam(defaultValue = DEFAULT_SORT_DIRECTION) String direction) {
        log.info("REST request to get orders page: {}, size: {}", page, size);
        return ApiResponse.success(
                "Lấy danh sách đơn hàng thành công.",
                orderServicePort.getOrders(
                        page,
                        size,
                        status,
                        fromDate,
                        toDate,
                        orderType,
                        receiveType,
                        search,
                        sortBy,
                        direction
                )
        );
    }

    @GetMapping("/my-orders")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PageResponse<OrderResponse>> getMyOrders(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_SIZE) int size,
            @RequestParam(required = false) List<String> status,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) List<String> orderType,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = DEFAULT_SORT_BY) String sortBy,
            @RequestParam(defaultValue = DEFAULT_SORT_DIRECTION) String direction,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to get my orders by user: {}", principal.getId());
        return ApiResponse.success(
                "Lấy danh sách đơn hàng của tôi thành công.",
                orderServicePort.getMyOrders(
                        page,
                        size,
                        status,
                        fromDate,
                        toDate,
                        orderType,
                        search,
                        sortBy,
                        direction,
                        principal.getId()
                )
        );
    }

    @GetMapping("/my-orders/{id}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<OrderResponse> getMyOrderDetail(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to get my order detail: {} by user: {}", id, principal.getId());
        try {
            return ApiResponse.success(
                    "Lấy chi tiết đơn hàng của tôi thành công.",
                    orderServicePort.getMyOrderDetail(id, principal.getId())
            );
        } catch (DomainException ex) {
            if (ex.getErrorCode() == ErrorCode.ORDER_NOT_FOUND) {
                return ApiResponse.success(
                        NotificationReferenceAvailabilityResponse.UNAVAILABLE_MESSAGE,
                        null
                );
            }
            throw ex;
        }
    }

    @GetMapping("/my-orders/{id}/refund-eligibility")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<OrderRefundEligibilityResponse> getRefundEligibility(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Kiểm tra điều kiện hủy đơn & hoàn tiền thành công.",
                orderRefundServicePort.getRefundEligibility(id, principal.getId()));
    }

    @PostMapping("/{orderId}/refund")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<RefundRequestResponse> refundPaidOrder(
            @PathVariable java.util.UUID orderId,
            @Valid @RequestBody CreateOrderRefundRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Yêu cầu hoàn tiền đã được gửi và đang chờ duyệt.",
                orderRefundServicePort.refundPaidOrder(orderId, principal.getId(), request));
    }

    @GetMapping("/types")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_MEMBER + "', 'order:view')")
    public ApiResponse<List<EnumOptionResponse>> getOrderTypes() {
        return ApiResponse.success("Lấy danh sách loại đơn hàng thành công.", orderServicePort.getOrderTypes());
    }

    @GetMapping("/statuses")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_MEMBER + "', 'order:view')")
    public ApiResponse<List<EnumOptionResponse>> getOrderStatuses() {
        return ApiResponse.success("Lấy danh sách trạng thái đơn hàng thành công.", orderServicePort.getOrderStatuses());
    }

    @GetMapping("/receive-types")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_MEMBER + "', 'order:view')")
    public ApiResponse<List<EnumOptionResponse>> getOrderReceiveTypes() {
        return ApiResponse.success("Lấy danh sách hình thức nhận vé thành công.", orderServicePort.getOrderReceiveTypes());
    }

    @GetMapping("/detail-statuses")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_MEMBER + "', 'order:view')")
    public ApiResponse<List<EnumOptionResponse>> getOrderDetailStatuses() {
        return ApiResponse.success("Lấy danh sách trạng thái chi tiết đơn hàng thành công.", orderServicePort.getOrderDetailStatuses());
    }
}
