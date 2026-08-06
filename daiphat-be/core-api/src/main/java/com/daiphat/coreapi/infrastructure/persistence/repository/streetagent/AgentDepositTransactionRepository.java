package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.AgentDepositTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentDepositTransactionRepository extends JpaRepository<AgentDepositTransactionEntity, Long> {
}
