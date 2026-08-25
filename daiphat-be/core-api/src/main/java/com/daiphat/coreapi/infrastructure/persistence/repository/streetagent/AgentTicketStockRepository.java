package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationSerialStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.AgentTicketStockEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AgentTicketStockRepository extends JpaRepository<AgentTicketStockEntity, Long> {
    List<AgentTicketStockEntity> findByAllocationBatch_Id(Long batchId);

    Optional<AgentTicketStockEntity> findByAllocationBatch_IdAndLotteryTicketSerial_Id(Long batchId, Long serialId);

    List<AgentTicketStockEntity> findByAllocationBatch_IdAndStatus(Long batchId, AllocationSerialStatus status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            DELETE FROM AgentTicketStockEntity s
            WHERE s.lotteryTicketSerial.id IN :serialIds
            """)
    int deleteByLotteryTicketSerial_IdIn(@Param("serialIds") Collection<Long> serialIds);
}
