package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {

    @Query("""
            select coalesce(sum(t.amount), 0)
            from TransactionEntity t
            where t.status = :status
              and (
                  t.transactionType = :businessType
                  or (
                      t.transactionType is null
                      and t.order is not null
                      and t.type <> :refundType
                  )
              )
              and coalesce(t.paidAt, t.createdAt) >= :fromInclusive
              and coalesce(t.paidAt, t.createdAt) < :toExclusive
            """)
    java.math.BigDecimal sumCompletedOrderPayments(
            @Param("fromInclusive") LocalDateTime fromInclusive,
            @Param("toExclusive") LocalDateTime toExclusive,
            @Param("status") TransactionStatus status,
            @Param("businessType") TransactionBusinessType businessType,
            @Param("refundType") TransactionType refundType
    );

    default java.math.BigDecimal sumCompletedOrderPayments(
            LocalDateTime fromInclusive,
            LocalDateTime toExclusive) {
        return sumCompletedOrderPayments(
                fromInclusive,
                toExclusive,
                TransactionStatus.COMPLETED,
                TransactionBusinessType.ORDER_PAYMENT,
                TransactionType.REFUND
        );
    }

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

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from TransactionEntity t where t.paymentRef like concat(:prefix, '%')")
    int deleteByPaymentRefStartingWith(@Param("prefix") String prefix);
}
