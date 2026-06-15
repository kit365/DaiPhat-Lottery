package com.daiphat.coreapi.application.port.out.order;

import com.daiphat.coreapi.domain.model.orders.OrderModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepositoryPort {

    OrderModel save(OrderModel order);

    Optional<OrderModel> findById(UUID id);

    Optional<OrderModel> findByIdWithLock(UUID id);

    Optional<OrderModel> findByGatewayOrderCode(Long gatewayOrderCode);

    boolean existsByOrderCode(String orderCode);

    Page<OrderModel> findMyOrders(
            Pageable pageable,
            UUID userId,
            com.daiphat.coreapi.domain.model.enums.order.OrderStatus status,
            com.daiphat.coreapi.domain.model.enums.order.OrderType orderType,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    );

    List<UUID> findPendingPaymentOrderIdsCreatedBefore(LocalDateTime threshold);
}
