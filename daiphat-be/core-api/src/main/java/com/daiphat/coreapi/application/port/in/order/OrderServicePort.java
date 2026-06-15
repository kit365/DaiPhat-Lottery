package com.daiphat.coreapi.application.port.in.order;

import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.domain.model.orders.OrderModel;

import java.util.List;
import java.util.UUID;

public interface OrderServicePort {

    OrderModel createOnlineOrder(CreateOnlineOrderRequest request, UUID customerId);

    OrderModel createDirectOrder(CreateDirectOrderRequest request, UUID operatorId);

    List<EnumOptionResponse> getOrderTypes();

    List<EnumOptionResponse> getOrderStatuses();

    List<EnumOptionResponse> getOrderReceiveTypes();

    List<EnumOptionResponse> getOrderDetailStatuses();

    List<EnumOptionResponse> getOrderRefundStatuses();
}
