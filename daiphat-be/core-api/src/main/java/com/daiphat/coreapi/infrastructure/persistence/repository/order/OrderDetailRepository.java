package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface OrderDetailRepository extends JpaRepository<OrderDetailEntity, Long>, JpaSpecificationExecutor<OrderDetailEntity> {
}
