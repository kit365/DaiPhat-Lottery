package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {

    @Query(value = """
            SELECT COALESCE(paid_at, updated_at, created_at)
            FROM transactions
            WHERE order_id = :orderId
              AND status = 'COMPLETED'
              AND type <> 'REFUND'
            ORDER BY COALESCE(paid_at, updated_at, created_at) DESC
            LIMIT 1
            """, nativeQuery = true)
    Optional<LocalDateTime> findLatestPaymentSuccessAt(@Param("orderId") UUID orderId);

    @Query(value = "SELECT nextval('payment_order_code_seq')", nativeQuery = true)
    Long getNextGatewayOrderCode();

    @Query(value = "SELECT setval('payment_order_code_seq', :value, false)", nativeQuery = true)
    Long resetGatewayOrderCodeSequence(@Param("value") Long value);

    Optional<TransactionEntity> findByGatewayOrderCode(Long gatewayOrderCode);

    Optional<TransactionEntity> findFirstByOrder_IdAndTypeOrderByPaidAtDescIdDesc(UUID orderId, TransactionType type);

    Optional<TransactionEntity> findFirstByRefundRequest_IdOrderByPaidAtDescIdDesc(Long refundRequestId);
}
