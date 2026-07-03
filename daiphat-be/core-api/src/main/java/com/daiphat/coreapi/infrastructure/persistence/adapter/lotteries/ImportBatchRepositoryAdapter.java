package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.ImportBatchLinePersistenceMapper;
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
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ImportBatchRepositoryAdapter implements ImportBatchRepositoryPort {

    private final ImportBatchRepository importBatchRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final UserRepository userRepository;
    private final ImportBatchPersistenceMapper importBatchPersistenceMapper;
    private final ImportBatchLinePersistenceMapper importBatchLinePersistenceMapper;

    @Override
    public ImportBatchModel save(ImportBatchModel model) {
        ImportBatchEntity entity = importBatchPersistenceMapper.toEntity(model);
        if (model.getImportedBy() != null) {
            entity.setImportedBy(userRepository.getReferenceById(model.getImportedBy()));
        }

        entity.getLines().clear();
        if (model.getLines() != null) {
            for (ImportBatchLineModel lineModel : model.getLines()) {
                ImportBatchLineEntity lineEntity = importBatchLinePersistenceMapper.toEntity(lineModel);
                lineEntity.setImportBatch(entity);
                if (lineModel.getLotteryStationId() != null) {
                    lineEntity.setLotteryStation(
                            lotteryStationRepository.getReferenceById(lineModel.getLotteryStationId())
                    );
                }
                entity.getLines().add(lineEntity);
            }
        }

        return importBatchPersistenceMapper.toDomain(importBatchRepository.save(entity));
    }

    @Override
    public Optional<ImportBatchModel> findById(Long id) {
        return importBatchRepository.findById(id)
                .map(importBatchPersistenceMapper::toDomain);
    }

    @Override
    public boolean existsByImportedByAndStatus(UUID importedBy, ImportBatchStatus status) {
        return importBatchRepository.existsByImportedBy_IdAndStatus(importedBy, status);
    }

    @Override
    public Optional<ImportBatchModel> findByImportedByAndStatus(UUID importedBy, ImportBatchStatus status) {
        return importBatchRepository.findFirstByImportedBy_IdAndStatusOrderByImportedAtDesc(importedBy, status)
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
