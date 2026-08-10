package com.daiphat.coreapi.infrastructure.adapter.out.streetagent.persistence;

import com.daiphat.coreapi.application.port.out.streetagent.AgentDepositTransactionRepositoryPort;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.AgentDepositTransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.AgentDepositTransactionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.AllocationBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.StreetAgentProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AgentDepositTransactionRepositoryAdapter implements AgentDepositTransactionRepositoryPort {
    private final AgentDepositTransactionRepository repository;
    private final StreetAgentProfileRepository profileRepository;
    private final AllocationBatchRepository allocationBatchRepository;

    @Override
    public void record(DepositTransaction tx) {
        repository.save(AgentDepositTransactionEntity.builder()
                .agent(profileRepository.getReferenceById(tx.profileId()))
                .allocation(tx.allocationBatchId() == null ? null : allocationBatchRepository.getReferenceById(tx.allocationBatchId()))
                .debtDate(tx.debtDate()).transactionType(tx.type()).status("COMPLETED")
                .requiredAmount(tx.requiredAmount()).paidAmount(tx.paidAmount()).remainingAmount(tx.remainingAmount())
                .returnedAmount(tx.returnedAmount()).balanceBefore(tx.balanceBefore()).balanceAfter(tx.balanceAfter())
                .paidAt(tx.paidAt()).collectedBy(tx.actorId()).reason(tx.reason()).paymentMethod("CASH")
                .build());
    }
}
