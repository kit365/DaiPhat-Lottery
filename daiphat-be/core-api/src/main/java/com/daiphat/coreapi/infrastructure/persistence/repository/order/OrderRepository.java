package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<OrderEntity, UUID> {

    boolean existsByOrderCode(String orderCode);

    @Query("""
            select distinct o
            from OrderEntity o
            left join fetch o.transactions t
            where t.gatewayOrderCode = :gatewayOrderCode
            """)
    Optional<OrderEntity> findByTransactionGatewayOrderCode(@Param("gatewayOrderCode") Long gatewayOrderCode);

    @Query("""
            select o.id
            from OrderEntity o
            where o.status = :status
              and o.createdAt <= :threshold
            """)
    List<UUID> findPendingPaymentOrderIdsCreatedBefore(
            @Param("status") OrderStatus status,
            @Param("threshold") LocalDateTime threshold
    );
}
