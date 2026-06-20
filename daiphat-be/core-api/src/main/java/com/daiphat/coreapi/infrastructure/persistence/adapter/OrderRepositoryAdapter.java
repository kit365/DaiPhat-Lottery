package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
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
    public void deleteById(UUID id) {
        orderRepository.deleteById(id);
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
            List<OrderStatus> statuses,
            List<OrderType> orderTypes,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    ) {
        return orderRepository.findAll(
                OrderSpecification.myOrders(userId, statuses, orderTypes, fromDate, toDate, search),
                pageable
        ).map(orderPersistenceMapper::toDomain);
    }

    @Override
    public Page<OrderModel> findOrders(
            Pageable pageable,
            List<OrderStatus> statuses,
            List<OrderType> orderTypes,
            List<OrderReceiveType> receiveTypes,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    ) {
        return orderRepository.findAll(
                OrderSpecification.orders(statuses, orderTypes, receiveTypes, fromDate, toDate, search),
                pageable
        ).map(orderPersistenceMapper::toDomain);
    }

    @Override
    public long countAllOrders(
            List<OrderType> orderTypes,
            List<OrderReceiveType> receiveTypes,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    ) {
        return orderRepository.count(
                OrderSpecification.orders(List.of(), orderTypes, receiveTypes, fromDate, toDate, search)
        );
    }

    @Override
    public long countOrdersByStatus(
            OrderStatus status,
            List<OrderType> orderTypes,
            List<OrderReceiveType> receiveTypes,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    ) {
        return orderRepository.count(
                OrderSpecification.orders(List.of(status), orderTypes, receiveTypes, fromDate, toDate, search)
        );
    }

    @Override
    public List<UUID> findPendingPaymentOrderIdsCreatedBefore(LocalDateTime threshold) {
        return orderRepository.findPendingPaymentOrderIdsCreatedBefore(OrderStatus.PENDING_PAYMENT, threshold);
    }

    @Override
    public void assignGuestOrdersToUserByEmail(UUID userId, String email) {
        if (userId == null || email == null || email.isBlank()) {
            return;
        }
        orderRepository.assignGuestOrdersToUserByEmail(userId, email);
    }

    @Override
    public boolean existsByLotteryTicketId(Long lotteryTicketId) {
        return orderRepository.existsOrderDetailByLotteryTicketId(lotteryTicketId);
    }

    @Override
    public boolean existsByLotteryTicketSerialId(Long lotteryTicketSerialId) {
        return orderRepository.existsOrderDetailByLotteryTicketSerialId(lotteryTicketSerialId);
    }
}
