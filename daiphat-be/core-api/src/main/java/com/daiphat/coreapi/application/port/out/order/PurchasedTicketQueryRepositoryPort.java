package com.daiphat.coreapi.application.port.out.order;

import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

public interface PurchasedTicketQueryRepositoryPort {

    Page<OrderDetailEntity> findPurchasedTickets(Specification<OrderDetailEntity> specification, Pageable pageable);
}
