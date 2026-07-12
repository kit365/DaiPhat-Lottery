package com.daiphat.coreapi.infrastructure.adapter.out.order;

import com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailSerialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class OrderDetailSerialRepositoryAdapter implements OrderDetailSerialRepositoryPort {

    private final OrderDetailSerialRepository orderDetailSerialRepository;

    @Override
    public List<Long> findSerialIdsByOrderDetailId(Long orderDetailId) {
        if (orderDetailId == null) {
            return List.of();
        }
        return orderDetailSerialRepository.findSerialIdsByOrderDetailId(orderDetailId);
    }
}
