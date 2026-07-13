package com.daiphat.coreapi.infrastructure.persistence.adapter.order;

import com.daiphat.coreapi.application.port.out.order.TicketReplacementHistoryRepositoryPort;
import com.daiphat.coreapi.domain.model.orders.TicketReplacementHistoryModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TicketReplacementHistoryEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TicketReplacementHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class TicketReplacementHistoryRepositoryAdapter implements TicketReplacementHistoryRepositoryPort {

    private final TicketReplacementHistoryRepository repository;

    @Override
    public TicketReplacementHistoryModel save(TicketReplacementHistoryModel model) {
        TicketReplacementHistoryEntity entity = toEntity(model);
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(LocalDateTime.now());
        }
        TicketReplacementHistoryEntity saved = repository.save(entity);
        return toDomain(saved);
    }

    private TicketReplacementHistoryEntity toEntity(TicketReplacementHistoryModel model) {
        return TicketReplacementHistoryEntity.builder()
                .id(model.getId())
                .orderId(model.getOrderId())
                .orderDetailId(model.getOrderDetailId())
                .oldTicketSerial(serialRef(model.getOldTicketSerialId()))
                .newTicketSerial(serialRef(model.getNewTicketSerialId()))
                .reason(model.getReason())
                .note(model.getNote())
                .handledBy(userRef(model.getHandledBy()))
                .createdAt(model.getCreatedAt())
                .build();
    }

    private TicketReplacementHistoryModel toDomain(TicketReplacementHistoryEntity entity) {
        return TicketReplacementHistoryModel.builder()
                .id(entity.getId())
                .orderId(entity.getOrderId())
                .orderDetailId(entity.getOrderDetailId())
                .oldTicketSerialId(entity.getOldTicketSerial() != null ? entity.getOldTicketSerial().getId() : null)
                .newTicketSerialId(entity.getNewTicketSerial() != null ? entity.getNewTicketSerial().getId() : null)
                .reason(entity.getReason())
                .note(entity.getNote())
                .handledBy(entity.getHandledBy() != null ? entity.getHandledBy().getId() : null)
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private LotteryTicketSerialEntity serialRef(Long id) {
        if (id == null) {
            return null;
        }
        LotteryTicketSerialEntity entity = new LotteryTicketSerialEntity();
        entity.setId(id);
        return entity;
    }

    private UserEntity userRef(java.util.UUID id) {
        if (id == null) {
            return null;
        }
        UserEntity entity = new UserEntity();
        entity.setId(id);
        return entity;
    }
}
