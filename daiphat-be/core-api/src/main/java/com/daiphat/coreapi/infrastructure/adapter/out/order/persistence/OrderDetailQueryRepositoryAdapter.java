package com.daiphat.coreapi.infrastructure.adapter.out.order.persistence;

import com.daiphat.coreapi.application.port.out.order.OrderDetailQueryRepositoryPort;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OrderDetailQueryRepositoryAdapter implements OrderDetailQueryRepositoryPort {

    private final OrderDetailRepository orderDetailRepository;

    @Override
    public Optional<ActiveSerialOrderContext> findActiveContextBySerialId(Long serialId) {
        return orderDetailRepository.findActiveBySerialId(serialId)
                .map(this::toContext);
    }

    private ActiveSerialOrderContext toContext(OrderDetailEntity entity) {
        return new ActiveSerialOrderContext(entity.getOrder().getId(), entity.getId());
    }
}
