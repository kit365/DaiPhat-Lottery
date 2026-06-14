package com.daiphat.coreapi.application.port.in.order;

import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.domain.model.orders.OrderModel;

import java.util.UUID;

public interface OrderServicePort {

    OrderModel createOnlineOrder(CreateOnlineOrderRequest request, UUID customerId);

    OrderModel createDirectOrder(CreateDirectOrderRequest request, UUID operatorId);
}
