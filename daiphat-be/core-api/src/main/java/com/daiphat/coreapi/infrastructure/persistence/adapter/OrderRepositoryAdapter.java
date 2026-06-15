package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.order.OrderPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.OrderSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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
    public Optional<OrderModel> findByIdWithLock(UUID id) {
        return orderRepository.findOrderEntityById(id).map(orderPersistenceMapper::toDomain);
    }

    @Override
    public Optional<OrderModel> findByGatewayOrderCode(Long gatewayOrderCode) {
        return orderRepository.findDistinctByTransactions_GatewayOrderCode(gatewayOrderCode)
                .map(orderPersistenceMapper::toDomain);
    }

    @Override
    public boolean existsByOrderCode(String orderCode) {
        return orderRepository.existsByOrderCode(orderCode);
    }

    @Override
    public Page<OrderModel> findMyOrders(
            Pageable pageable,
            UUID userId,
            OrderStatus status,
            OrderType orderType,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    ) {
        return orderRepository.findAll(
                OrderSpecification.myOrders(userId, status, orderType, fromDate, toDate, search),
                pageable
        ).map(orderPersistenceMapper::toDomain);
    }

    @Override
    public List<UUID> findPendingPaymentOrderIdsCreatedBefore(LocalDateTime threshold) {
        return orderRepository.findPendingPaymentOrderIdsCreatedBefore(OrderStatus.PENDING_PAYMENT, threshold);
    }
}
