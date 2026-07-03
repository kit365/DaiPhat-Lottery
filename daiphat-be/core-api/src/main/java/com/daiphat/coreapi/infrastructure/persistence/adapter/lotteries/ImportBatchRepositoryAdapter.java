package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.ImportBatchPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.lotteries.ImportBatchSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class ImportBatchRepositoryAdapter implements ImportBatchRepositoryPort {

    private final ImportBatchRepository importBatchRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final UserRepository userRepository;
    private final ImportBatchPersistenceMapper importBatchPersistenceMapper;

    @Override
    public ImportBatchModel save(ImportBatchModel model) {
        var entity = importBatchPersistenceMapper.toEntity(model);
        if (model.getLotteryStationId() != null) {
            entity.setLotteryStation(lotteryStationRepository.getReferenceById(model.getLotteryStationId()));
        }
        if (model.getImportedBy() != null) {
            entity.setImportedBy(userRepository.getReferenceById(model.getImportedBy()));
        }
        return importBatchPersistenceMapper.toDomain(importBatchRepository.save(entity));
    }

    @Override
    public Optional<ImportBatchModel> findById(Long id) {
        return importBatchRepository.findById(id)
                .map(importBatchPersistenceMapper::toDomain);
    }

    @Override
    public Page<ImportBatchModel> findAll(
            Pageable pageable,
            Long lotteryStationId,
            LocalDate drawDate,
            ImportBatchStatus status,
            ImportBatchType batchType
    ) {
        return importBatchRepository.findAll(
                        ImportBatchSpecification.filter(lotteryStationId, drawDate, status, batchType),
                        pageable
                )
                .map(importBatchPersistenceMapper::toDomain);
    }
}
