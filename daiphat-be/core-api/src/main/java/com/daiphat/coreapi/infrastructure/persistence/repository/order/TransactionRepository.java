package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {

    @Query(value = "SELECT nextval('payment_order_code_seq')", nativeQuery = true)
    Long getNextGatewayOrderCode();

    @Query(value = "SELECT setval('payment_order_code_seq', :value, false)", nativeQuery = true)
    Long resetGatewayOrderCodeSequence(@Param("value") Long value);

    Optional<TransactionEntity> findByGatewayOrderCode(Long gatewayOrderCode);
}
