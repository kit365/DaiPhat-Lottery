package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.ImportBatchLinePersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class ImportBatchLineRepositoryAdapter implements ImportBatchLineRepositoryPort {

    private final ImportBatchLineRepository importBatchLineRepository;
    private final ImportBatchRepository importBatchRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final ImportBatchLinePersistenceMapper importBatchLinePersistenceMapper;

    @Override
    public ImportBatchLineModel save(ImportBatchLineModel model) {
        var entity = importBatchLinePersistenceMapper.toEntity(model);
        if (model.getImportBatchId() != null) {
            ImportBatchEntity batch = importBatchRepository.getReferenceById(model.getImportBatchId());
            entity.setImportBatch(batch);
        }
        if (model.getLotteryStationId() != null) {
            entity.setLotteryStation(lotteryStationRepository.getReferenceById(model.getLotteryStationId()));
        }
        return importBatchLinePersistenceMapper.toDomain(importBatchLineRepository.save(entity));
    }

    @Override
    public Optional<ImportBatchLineModel> findById(Long id) {
        return importBatchLineRepository.findByIdAndDeletedAtIsNull(id)
                .map(importBatchLinePersistenceMapper::toDomain);
    }

    @Override
    public List<ImportBatchLineModel> findByImportBatchId(Long importBatchId) {
        return importBatchLineRepository.findByImportBatch_IdAndDeletedAtIsNull(importBatchId).stream()
                .map(importBatchLinePersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public boolean existsByStationAndDrawDateAndBatchType(
            Long stationId,
            LocalDate drawDate,
            ImportBatchType batchType
    ) {
        return importBatchLineRepository.existsByStationAndDrawDateAndBatchType(stationId, drawDate, batchType);
    }

    @Override
    public boolean existsDraftLineForStationAndDrawDate(Long stationId, LocalDate drawDate) {
        return importBatchLineRepository.existsDraftLineForStationAndDrawDate(stationId, drawDate);
    }

    @Override
    public boolean existsNonDraftLineForStationAndDrawDate(Long stationId, LocalDate drawDate) {
        return importBatchLineRepository.existsNonDraftLineForStationAndDrawDate(stationId, drawDate);
    }

    @Override
    public Optional<Long> findDraftBatchIdForStationAndDrawDate(Long stationId, LocalDate drawDate) {
        return importBatchLineRepository.findDraftBatchIdsForStationAndDrawDate(stationId, drawDate).stream()
                .findFirst();
    }

    @Override
    public long nextBatchCodeSequence() {
        return importBatchLineRepository.nextBatchCodeSequence();
    }
}
