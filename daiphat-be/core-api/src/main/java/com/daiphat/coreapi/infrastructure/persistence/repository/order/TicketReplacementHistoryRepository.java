package com.daiphat.coreapi.infrastructure.persistence.repository.order;

import com.daiphat.coreapi.infrastructure.persistence.entity.order.TicketReplacementHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketReplacementHistoryRepository extends JpaRepository<TicketReplacementHistoryEntity, Long> {
}
