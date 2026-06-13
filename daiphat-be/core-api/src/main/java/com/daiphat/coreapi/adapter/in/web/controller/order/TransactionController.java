package com.daiphat.coreapi.adapter.in.web.controller.order;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.application.dto.request.order.CollectDirectOrderCashRequest;
import com.daiphat.coreapi.application.dto.request.order.HandleOnlinePaymentFailureRequest;
import com.daiphat.coreapi.application.dto.request.order.HandleOnlinePaymentSuccessRequest;
import com.daiphat.coreapi.application.dto.request.order.ProcessPaymentRequest;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.port.in.order.OrderEnumServicePort;
import com.daiphat.coreapi.application.port.in.order.TransactionServicePort;
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
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/transactions")
@RequiredArgsConstructor
@Validated
@Slf4j
public class TransactionController {

    private static final String ORDER_ID_PATH = "/{orderId}";
    private static final String PAYMENT_PATH = "/payment";

    private final TransactionServicePort transactionServicePort;
    private final OrderEnumServicePort orderEnumServicePort;
    private final OrderApplicationMapper orderApplicationMapper;

    @PostMapping(ORDER_ID_PATH + PAYMENT_PATH)
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_MEMBER + "', '" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<PaymentResult> processPayment(
            @PathVariable UUID orderId,
            @Valid @RequestBody ProcessPaymentRequest request) {
        log.info("REST request to process payment for order: {}", orderId);
        PaymentResult paymentResult = transactionServicePort.processPayment(orderId, request.type());
        return ApiResponse.success("Khởi tạo thanh toán thành công.", paymentResult);
    }

    @PatchMapping(ORDER_ID_PATH + PAYMENT_PATH + "/success")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_MEMBER + "', '" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<OrderResponse> handleOnlinePaymentSuccess(
            @PathVariable UUID orderId,
            @Valid @RequestBody HandleOnlinePaymentSuccessRequest request) {
        log.info("REST request to mark online payment success for order: {}", orderId);
        OrderModel order = transactionServicePort.handleOnlinePaymentSuccess(orderId, request.paymentRef());
        return ApiResponse.success("Cập nhật thanh toán thành công.", orderApplicationMapper.toResponse(order));
    }

    @PatchMapping(ORDER_ID_PATH + PAYMENT_PATH + "/failure")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_MEMBER + "', '" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<OrderResponse> handleOnlinePaymentFailure(
            @PathVariable UUID orderId,
            @Valid @RequestBody HandleOnlinePaymentFailureRequest request) {
        log.info("REST request to mark online payment failure for order: {}", orderId);
        OrderModel order = transactionServicePort.handleOnlinePaymentFailure(orderId, request.failureReason());
        return ApiResponse.success("Cập nhật thanh toán thất bại thành công.", orderApplicationMapper.toResponse(order));
    }

    @PatchMapping(ORDER_ID_PATH + "/collect-cash")
    @PreAuthorize("hasAnyAuthority('" + RoleConstants.ROLE_STAFF_OPERATOR + "', '" + RoleConstants.ADMIN + "')")
    public ApiResponse<OrderResponse> collectDirectOrderCash(
            @PathVariable UUID orderId,
            @Valid @RequestBody CollectDirectOrderCashRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to collect cash for order: {} by user: {}", orderId, principal.getId());
        OrderModel order = transactionServicePort.collectDirectOrderCash(orderId, principal.getId(), request.note());
        return ApiResponse.success("Thu tiền đơn hàng tại quầy thành công.", orderApplicationMapper.toResponse(order));
    }

    @GetMapping("/types")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EnumOptionResponse>> getTransactionTypes() {
        return ApiResponse.success("Lấy danh sách hình thức thanh toán thành công.", orderEnumServicePort.getTransactionTypes());
    }

    @GetMapping("/statuses")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<EnumOptionResponse>> getTransactionStatuses() {
        return ApiResponse.success("Lấy danh sách trạng thái giao dịch thành công.", orderEnumServicePort.getTransactionStatuses());
    }
}
