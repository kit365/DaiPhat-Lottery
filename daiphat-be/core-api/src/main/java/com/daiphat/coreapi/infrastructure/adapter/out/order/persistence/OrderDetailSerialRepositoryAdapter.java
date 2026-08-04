package com.daiphat.coreapi.infrastructure.adapter.out.order.persistence;

import com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Resolves the single serial owned by an order-detail.
 * Historically backed by {@code order_detail_serials}; that junction is removed —
 * ownership is {@code lottery_ticket_serial_id} / {@code replaced_by_ticket_serial_id}.
 */
@Component
@RequiredArgsConstructor
public class OrderDetailSerialRepositoryAdapter implements OrderDetailSerialRepositoryPort {

    private final OrderDetailRepository orderDetailRepository;

    @Override
    public List<Long> findSerialIdsByOrderDetailId(Long orderDetailId) {
        if (orderDetailId == null) {
            return List.of();
        }
        return orderDetailRepository.findById(orderDetailId)
                .map(this::resolveCurrentSerialId)
                .filter(id -> id != null)
                .map(List::of)
                .orElseGet(List::of);
    }

    @Override
    public void replaceSerialAllocation(Long orderDetailId, Long oldSerialId, Long newSerialId) {
        // Replacement is persisted on order_details.replaced_by_ticket_serial_id via OrderDetailModel.
        // No junction row to update.
    }

    private Long resolveCurrentSerialId(OrderDetailEntity detail) {
        if (detail.getReplacedByTicketSerial() != null && detail.getReplacedByTicketSerial().getId() != null) {
            return detail.getReplacedByTicketSerial().getId();
        }
        if (detail.getLotteryTicketSerial() != null) {
            return detail.getLotteryTicketSerial().getId();
        }
        return null;
    }
}
