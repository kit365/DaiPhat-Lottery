package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationSerialStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.AgentTicketStockEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgentTicketStockRepository extends JpaRepository<AgentTicketStockEntity, Long> {
    List<AgentTicketStockEntity> findByAllocationBatch_Id(Long batchId);

    Optional<AgentTicketStockEntity> findByAllocationBatch_IdAndLotteryTicketSerial_Id(Long batchId, Long serialId);

    List<AgentTicketStockEntity> findByAllocationBatch_IdAndStatus(Long batchId, AllocationSerialStatus status);
}
