package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<OrderEntity, UUID>, JpaSpecificationExecutor<OrderEntity> {

    @EntityGraph(attributePaths = {"user", "transactions"})
    @Override
    Optional<OrderEntity> findById(UUID id);

    @EntityGraph(attributePaths = {"transactions"})
    Page<OrderEntity> findAll(Specification<OrderEntity> spec, Pageable pageable);

    boolean existsByOrderCode(String orderCode);

    /**
     * Fetch only orderDetails (and nested serials). Do not include {@code transactions} here —
     * Hibernate cannot simultaneously fetch two bags ({@code MultipleBagFetchException}).
     */
    @EntityGraph(attributePaths = {
            "orderDetails",
            "orderDetails.lotteryTicketSerial",
            "orderDetails.replacedByTicketSerial"
    })
    List<OrderEntity> findByOrderCodeStartingWith(String orderCodePrefix);

    @EntityGraph(attributePaths = {"orderDetails"})
    java.util.Optional<OrderEntity> findByOrderCode(String orderCode);

    /**
     * Lock order for update. Fetch at most one bag collection to avoid
     * {@code MultipleBagFetchException} (orderDetails + transactions).
     * Payment time for refund grace falls back to TransactionRepository when needed.
     */
    @EntityGraph(attributePaths = {"user", "orderDetails"})
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

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update OrderEntity o
               set o.user.id = :userId
             where o.user is null
               and o.email is not null
               and lower(o.email) = lower(:email)
            """)
    int assignGuestOrdersToUserByEmail(
            @Param("userId") UUID userId,
            @Param("email") String email
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
            select (
                exists (
                    select 1
                    from OrderDetailEntity od
                    left join od.replacedByTicketSerial replacedSerial
                    where od.lotteryTicketSerial.id = :lotteryTicketSerialId
                       or replacedSerial.id = :lotteryTicketSerialId
                )
                or exists (
                    select 1
                    from OrderDetailSerialEntity ods
                    where ods.lotteryTicketSerial.id = :lotteryTicketSerialId
                )
            )
            """)
    boolean existsOrderDetailByLotteryTicketSerialId(@Param("lotteryTicketSerialId") Long lotteryTicketSerialId);
}
