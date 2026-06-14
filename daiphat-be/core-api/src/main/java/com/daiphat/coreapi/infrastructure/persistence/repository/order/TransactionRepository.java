package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface TransactionRepository extends JpaRepository<TransactionEntity, Long> {

    @Query(value = "SELECT nextval('payment_order_code_seq')", nativeQuery = true)
    Long getNextGatewayOrderCode();

    Optional<TransactionEntity> findByGatewayOrderCode(Long gatewayOrderCode);
}
