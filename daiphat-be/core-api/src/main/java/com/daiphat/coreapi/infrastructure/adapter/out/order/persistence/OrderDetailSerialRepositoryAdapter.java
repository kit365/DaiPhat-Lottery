package com.daiphat.coreapi.infrastructure.adapter.out.order.persistence;

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

    @Override
    public void replaceSerialAllocation(Long orderDetailId, Long oldSerialId, Long newSerialId) {
        if (orderDetailId == null || oldSerialId == null || newSerialId == null) {
            return;
        }
        orderDetailSerialRepository.replaceSerialAllocation(orderDetailId, oldSerialId, newSerialId);
    }
}
