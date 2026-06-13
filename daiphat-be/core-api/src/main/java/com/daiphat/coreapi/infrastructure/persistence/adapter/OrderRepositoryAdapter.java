package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.order.OrderPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OrderRepositoryAdapter implements OrderRepositoryPort {

    private final OrderRepository orderRepository;
    private final OrderPersistenceMapper orderPersistenceMapper;

    @Override
    public OrderModel save(OrderModel order) {
        OrderEntity entity = orderPersistenceMapper.toEntity(order);
        OrderEntity saved = orderRepository.save(entity);
        return orderPersistenceMapper.toDomain(saved);
    }

    @Override
    public Optional<OrderModel> findById(UUID id) {
        return orderRepository.findById(id).map(orderPersistenceMapper::toDomain);
    }

    @Override
    public boolean existsByOrderCode(String orderCode) {
        return orderRepository.existsByOrderCode(orderCode);
    }
}
