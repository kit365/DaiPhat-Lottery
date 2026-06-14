package com.daiphat.coreapi.application.port.out.order;

import com.daiphat.coreapi.domain.model.orders.OrderModel;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepositoryPort {

    OrderModel save(OrderModel order);

    Optional<OrderModel> findById(UUID id);

    Optional<OrderModel> findByGatewayOrderCode(Long gatewayOrderCode);

    boolean existsByOrderCode(String orderCode);

    List<OrderModel> findPendingPaymentOrdersCreatedBefore(LocalDateTime threshold);
}
