package com.daiphat.coreapi.infrastructure.persistence.adapter.order;

import com.daiphat.coreapi.application.port.out.order.PurchasedTicketQueryRepositoryPort;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PurchasedTicketQueryRepositoryAdapter implements PurchasedTicketQueryRepositoryPort {

    private final OrderDetailRepository orderDetailRepository;

    @Override
    public Page<OrderDetailEntity> findPurchasedTickets(
            Specification<OrderDetailEntity> specification,
            Pageable pageable) {
        return orderDetailRepository.findAll(specification, pageable);
    }
}
