package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.importbatch.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
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
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.lotteries.ImportBatchSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ImportBatchRepositoryAdapter implements ImportBatchRepositoryPort {

    private final ImportBatchRepository importBatchRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final LotterySupplierRepository lotterySupplierRepository;
    private final UserRepository userRepository;
    private final ImportBatchPersistenceMapper importBatchPersistenceMapper;
    private final ImportBatchLinePersistenceMapper importBatchLinePersistenceMapper;

    @Override
    public ImportBatchModel save(ImportBatchModel model) {
        if (model.getId() == null) {
            return toDomainWithActiveLines(saveNewBatch(model));
        }
        return toDomainWithActiveLines(saveExistingBatch(model));
    }

    private ImportBatchEntity saveNewBatch(ImportBatchModel model) {
        ImportBatchEntity entity = importBatchPersistenceMapper.toEntity(model);
        applyBatchReferences(entity, model);
        entity.getLines().clear();
        if (model.getLines() != null) {
            for (ImportBatchLineModel lineModel : model.getLines()) {
                ImportBatchLineEntity lineEntity = importBatchLinePersistenceMapper.toEntity(lineModel);
                lineEntity.setImportBatch(entity);
                applyLineStation(lineEntity, lineModel);
                entity.getLines().add(lineEntity);
            }
        }
        return importBatchRepository.save(entity);
    }

    private ImportBatchEntity saveExistingBatch(ImportBatchModel model) {
        ImportBatchEntity entity = importBatchRepository.findById(model.getId())
                .orElseThrow();

        importBatchPersistenceMapper.updateEntityFromModel(model, entity);
        applyBatchReferences(entity, model);

        if (model.getLines() != null) {
            var existingById = entity.getLines().stream()
                    .filter(line -> line.getId() != null)
                    .collect(Collectors.toMap(ImportBatchLineEntity::getId, line -> line));

            for (ImportBatchLineModel lineModel : model.getLines()) {
                if (lineModel.getId() != null && existingById.containsKey(lineModel.getId())) {
                    ImportBatchLineEntity lineEntity = existingById.get(lineModel.getId());
                    importBatchLinePersistenceMapper.updateEntityFromModel(lineModel, lineEntity);
                    applyLineStation(lineEntity, lineModel);
                } else if (lineModel.getId() == null) {
                    ImportBatchLineEntity lineEntity = importBatchLinePersistenceMapper.toEntity(lineModel);
                    lineEntity.setImportBatch(entity);
                    applyLineStation(lineEntity, lineModel);
                    entity.getLines().add(lineEntity);
                }
            }
        }

        return importBatchRepository.save(entity);
    }

    private void applyBatchReferences(ImportBatchEntity entity, ImportBatchModel model) {
        if (model.getImportedBy() != null) {
            entity.setImportedBy(userRepository.getReferenceById(model.getImportedBy()));
        }
        if (model.getSupplierId() != null) {
            entity.setSupplier(lotterySupplierRepository.getReferenceById(model.getSupplierId()));
        }
    }

    private void applyLineStation(ImportBatchLineEntity lineEntity, ImportBatchLineModel lineModel) {
        if (lineModel.getLotteryStationId() != null) {
            lineEntity.setLotteryStation(
                    lotteryStationRepository.getReferenceById(lineModel.getLotteryStationId())
            );
        }
    }

    private ImportBatchModel toDomainWithActiveLines(ImportBatchEntity entity) {
        ImportBatchModel model = importBatchPersistenceMapper.toDomain(entity);
        if (model.getLines() != null) {
            model.setLines(model.getLines().stream()
                    .filter(line -> line.getDeletedAt() == null)
                    .toList());
        }
        return model;
    }

    private ImportBatchModel toDomainHeaderOnly(ImportBatchEntity entity) {
        ImportBatchModel model = importBatchPersistenceMapper.toDomainHeaderOnly(entity);
        model.setLines(List.of());
        return model;
    }

    @Override
    public Optional<ImportBatchModel> findById(Long id) {
        return importBatchRepository.findById(id)
                .map(this::toDomainWithActiveLines);
    }

    @Override
    public boolean existsByImportedByAndStatus(UUID importedBy, ImportBatchStatus status) {
        return importBatchRepository.existsByImportedBy_IdAndStatus(importedBy, status);
    }

    @Override
    public boolean existsEditableBatchByImportedBy(UUID importedBy) {
        return importBatchRepository.existsByImportedBy_IdAndStatusIn(
                importedBy,
                List.of(
                        ImportBatchStatus.DRAFT,
                        ImportBatchStatus.RECEIVING,
                        ImportBatchStatus.PARTIALLY_IMPORTED
                )
        );
    }

    @Override
    public Optional<ImportBatchModel> findByImportedByAndStatus(UUID importedBy, ImportBatchStatus status) {
        return importBatchRepository.findFirstByImportedBy_IdAndStatusOrderByImportedAtDesc(importedBy, status)
                .map(this::toDomainWithActiveLines);
    }

    @Override
    public Optional<ImportBatchModel> findEditableBatchByImportedBy(UUID importedBy) {
        return importBatchRepository.findFirstByImportedBy_IdAndStatusInOrderByImportedAtDesc(
                        importedBy,
                        List.of(
                        ImportBatchStatus.DRAFT,
                        ImportBatchStatus.RECEIVING,
                        ImportBatchStatus.PARTIALLY_IMPORTED
                )
                )
                .map(this::toDomainWithActiveLines);
    }

    @Override
    public Optional<ImportBatchModel> findEditableBatchByImportedByAndDrawDateAndSupplierAndImportMode(
            UUID importedBy,
            LocalDate drawDate,
            Long supplierId,
            ImportBatchImportMode importMode
    ) {
        return importBatchRepository
                .findEditableBatchesByImportedByAndDrawDateAndSupplierAndImportMode(
                        importedBy,
                        drawDate,
                        supplierId,
                        importMode
                )
                .stream()
                .findFirst()
                .map(this::toDomainWithActiveLines);
    }

    @Override
    public Page<ImportBatchModel> findAll(
            Pageable pageable,
            Long lotteryStationId,
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            ImportBatchStatus status,
            ImportBatchType batchType
    ) {
        return importBatchRepository.findAll(
                        ImportBatchSpecification.filter(lotteryStationId, drawDateFrom, drawDateTo, status, batchType),
                        pageable
                )
                .map(this::toDomainWithActiveLines);
    }

    @Override
    public List<ImportBatchModel> findDraftInDayBatchesByDrawDate(LocalDate drawDate) {
        return importBatchRepository.findDraftInDayBatchesByDrawDate(drawDate).stream()
                .map(this::toDomainWithActiveLines)
                .toList();
    }

    @Override
    public List<ImportBatchModel> findDraftBatchesWithDrawDateBefore(LocalDate today) {
        return importBatchRepository.findDraftBatchesWithDrawDateBefore(today).stream()
                .map(this::toDomainWithActiveLines)
                .toList();
    }

    @Override
    public List<ImportBatchModel> findIncompleteDraftBatches() {
        return importBatchRepository.findIncompleteDraftBatches().stream()
                .map(this::toDomainWithActiveLines)
                .toList();
    }

    @Override
    public List<ImportBatchModel> findEditableBatchesWithoutLines() {
        return importBatchRepository.findEditableBatchesWithoutLines().stream()
                .map(this::toDomainHeaderOnly)
                .toList();
    }

    @Override
    public long nextHeaderBatchCodeSequence() {
        return importBatchRepository.nextHeaderBatchCodeSequence();
    }

    @Override
    public boolean existsNonCancelledBySupplierAndDrawDate(Long supplierId, LocalDate drawDate) {
        return importBatchRepository.existsNonCancelledBySupplierAndDrawDate(supplierId, drawDate);
    }

    @Override
    public List<ImportBatchModel> findBySupplierSettlementId(Long supplierSettlementId) {
        if (supplierSettlementId == null) {
            return List.of();
        }
        return importBatchRepository
                .findBySupplierSettlementIdAndDeletedAtIsNullOrderByDrawDateDescIdDesc(supplierSettlementId)
                .stream()
                .map(importBatchPersistenceMapper::toDomain)
                .toList();
    }
}
