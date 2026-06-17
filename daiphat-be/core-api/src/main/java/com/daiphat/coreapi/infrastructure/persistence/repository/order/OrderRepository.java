package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<OrderEntity, UUID>, JpaSpecificationExecutor<OrderEntity> {

    boolean existsByOrderCode(String orderCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OrderEntity> findOrderEntityById(UUID id);

    Optional<OrderEntity> findDistinctByTransactions_GatewayOrderCode(Long gatewayOrderCode);

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

    @Query("""
            select (count(od) > 0)
            from OrderDetailEntity od
            left join od.replacedByTicketSerial replacedSerial
            where od.lotteryTicketSerial.ticket.id = :lotteryTicketId
               or replacedSerial.ticket.id = :lotteryTicketId
            """)
    boolean existsOrderDetailByLotteryTicketId(@Param("lotteryTicketId") Long lotteryTicketId);

    @Query("""
            select (count(od) > 0)
            from OrderDetailEntity od
            left join od.replacedByTicketSerial replacedSerial
            where od.lotteryTicketSerial.id = :lotteryTicketSerialId
               or replacedSerial.id = :lotteryTicketSerialId
            """)
    boolean existsOrderDetailByLotteryTicketSerialId(@Param("lotteryTicketSerialId") Long lotteryTicketSerialId);
}
