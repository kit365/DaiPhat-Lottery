package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.AgentSettlementEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgentSettlementRepository extends JpaRepository<AgentSettlementEntity, Long> {
    Optional<AgentSettlementEntity> findByAllocationBatch_IdAndDeletedAtIsNull(Long allocationBatchId);

    List<AgentSettlementEntity> findByReport_IdAndDeletedAtIsNull(Long reportId);
}
