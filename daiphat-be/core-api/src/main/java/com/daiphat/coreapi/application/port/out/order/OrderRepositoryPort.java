package com.daiphat.coreapi.application.port.out.order;

import com.daiphat.coreapi.domain.model.orders.OrderModel;

import java.util.Optional;
import java.util.UUID;

public interface OrderRepositoryPort {

    OrderModel save(OrderModel order);

    Optional<OrderModel> findById(UUID id);

    boolean existsByOrderCode(String orderCode);
}
