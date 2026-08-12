package com.daiphat.coreapi.infrastructure.adapter.out.streetagent.persistence;

import com.daiphat.coreapi.application.port.out.streetagent.VendorDepositTransactionRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.AllocationBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.StreetAgentProfileEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Records vendor deposit events in the common {@code transactions} table. */
@Component
@RequiredArgsConstructor
public class VendorDepositTransactionRepositoryAdapter implements VendorDepositTransactionRepositoryPort {
    private final TransactionRepository transactionRepository;

    @Override
    public void record(DepositTransaction tx) {
        transactionRepository.save(TransactionEntity.builder()
                .streetAgentProfile(profileRef(tx.profileId()))
                .allocationBatch(batchRef(tx.allocationBatchId()))
                .businessDate(tx.businessDate())
                .transactionType(tx.transactionType())
                .amount(tx.amount())
                .status(TransactionStatus.COMPLETED)
                // Existing `type` still represents payment channel in the order flow.
                .type(TransactionType.OFFLINE)
                .paidAt(tx.paidAt())
                .codCollectedAt(tx.paidAt())
                .codCollectedBy(userRef(tx.actorId()))
                .note(tx.reason())
                .build());
    }

    private StreetAgentProfileEntity profileRef(Long id) {
        StreetAgentProfileEntity profile = new StreetAgentProfileEntity();
        profile.setId(id);
        return profile;
    }

    private AllocationBatchEntity batchRef(Long id) {
        if (id == null) {
            return null;
        }
        AllocationBatchEntity batch = new AllocationBatchEntity();
        batch.setId(id);
        return batch;
    }

    private UserEntity userRef(java.util.UUID id) {
        if (id == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(id);
        return user;
    }
}
