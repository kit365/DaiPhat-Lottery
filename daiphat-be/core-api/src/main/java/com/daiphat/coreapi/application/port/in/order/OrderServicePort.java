package com.daiphat.coreapi.application.port.in.order;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.ConfirmOrderHandoverRequest;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.application.dto.response.order.PendingPaymentReminderResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.domain.model.orders.OrderModel;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface OrderServicePort {

    OrderModel createOnlineOrder(CreateOnlineOrderRequest request, UUID customerId);

    OrderModel createDirectOrder(CreateDirectOrderRequest request, UUID operatorId);

    void linkGuestOrdersToAccount(UUID userId, String email);

    OrderResponse getOrderDetail(UUID orderId);

    OrderResponse getMyOrderDetail(UUID orderId, UUID customerId);

    OrderResponse updateOrderStatus(UUID orderId, OrderStatus status, String reason, UUID operatorId);

    StorageResult uploadHandoverEvidence(UUID orderId, UploadRequest request, UUID operatorId);

    OrderResponse submitPaymentTimeoutComplaint(UUID orderId, UploadRequest request, UUID customerId);

    OrderResponse reviewPaymentTimeoutComplaint(UUID orderId, boolean approved, String reason, UUID operatorId);

    long countPendingPaymentTimeoutComplaints();

    OrderResponse confirmOnlineOrderHandover(UUID orderId, ConfirmOrderHandoverRequest request, UUID operatorId);

    PageResponse<OrderResponse> getOrders(
            int page,
            int size,
            List<String> statuses,
            LocalDate fromDate,
            LocalDate toDate,
            List<String> orderTypes,
            List<String> receiveTypes,
            String search,
            String sortBy,
            String direction
    );

    PageResponse<OrderResponse> getMyOrders(
            int page,
            int size,
            List<String> statuses,
            LocalDate fromDate,
            LocalDate toDate,
            List<String> orderTypes,
            String search,
            String sortBy,
            String direction,
            UUID customerId
    );

    PendingPaymentReminderResponse getMyPendingPaymentReminder(UUID customerId);

    List<EnumOptionResponse> getOrderTypes();

    List<EnumOptionResponse> getOrderStatuses();

    List<EnumOptionResponse> getOrderReceiveTypes();

    List<EnumOptionResponse> getOrderDetailStatuses();
}
