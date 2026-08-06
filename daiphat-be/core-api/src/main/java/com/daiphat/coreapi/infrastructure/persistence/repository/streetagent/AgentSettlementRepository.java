package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.AgentSettlementEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentSettlementRepository extends JpaRepository<AgentSettlementEntity, Long> {
}
