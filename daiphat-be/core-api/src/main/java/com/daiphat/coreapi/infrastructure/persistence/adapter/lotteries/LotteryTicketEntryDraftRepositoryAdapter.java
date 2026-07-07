package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketEntryDraftRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketEntryDraftModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntryDraftEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryTicketEntryDraftPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketEntryDraftRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LotteryTicketEntryDraftRepositoryAdapter implements LotteryTicketEntryDraftRepositoryPort {

    private final LotteryTicketEntryDraftRepository lotteryTicketEntryDraftRepository;
    private final ImportBatchLineRepository importBatchLineRepository;
    private final UserRepository userRepository;
    private final LotteryTicketEntryDraftPersistenceMapper lotteryTicketEntryDraftPersistenceMapper;

    @Override
    public LotteryTicketEntryDraftModel save(LotteryTicketEntryDraftModel model) {
        LotteryTicketEntryDraftEntity entity = lotteryTicketEntryDraftPersistenceMapper.toEntity(model);
        if (model.getImportBatchLineId() != null) {
            entity.setImportBatchLine(importBatchLineRepository.getReferenceById(model.getImportBatchLineId()));
        }
        if (model.getOperatorId() != null) {
            entity.setOperator(userRepository.getReferenceById(model.getOperatorId()));
        }
        return lotteryTicketEntryDraftPersistenceMapper.toDomain(lotteryTicketEntryDraftRepository.save(entity));
    }

    @Override
    public List<LotteryTicketEntryDraftModel> findActiveByImportBatchIdAndOperatorId(
            Long importBatchId,
            UUID operatorId
    ) {
        return lotteryTicketEntryDraftRepository.findActiveByImportBatchIdAndOperatorId(importBatchId, operatorId)
                .stream()
                .map(lotteryTicketEntryDraftPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<LotteryTicketEntryDraftModel> findActiveByImportBatchLineIdAndOperatorId(
            Long importBatchLineId,
            UUID operatorId
    ) {
        return lotteryTicketEntryDraftRepository
                .findActiveByImportBatchLineIdAndOperatorId(importBatchLineId, operatorId)
                .map(lotteryTicketEntryDraftPersistenceMapper::toDomain);
    }

    @Override
    public Optional<LotteryTicketEntryDraftModel> findLatestByImportBatchLineIdAndOperatorId(
            Long importBatchLineId,
            UUID operatorId
    ) {
        return lotteryTicketEntryDraftRepository
                .findFirstByImportBatchLine_IdAndOperator_IdOrderByUpdatedAtDesc(importBatchLineId, operatorId)
                .map(lotteryTicketEntryDraftPersistenceMapper::toDomain);
    }
}
