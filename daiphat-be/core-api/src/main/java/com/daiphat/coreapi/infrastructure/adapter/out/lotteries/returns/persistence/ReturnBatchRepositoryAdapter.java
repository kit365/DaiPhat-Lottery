package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.returns.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.ReturnBatchPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.AllocationBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.lotteries.ReturnBatchSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class ReturnBatchRepositoryAdapter implements ReturnBatchRepositoryPort {

    private final ReturnBatchRepository returnBatchRepository;
    private final ReturnBatchLineRepository returnBatchLineRepository;
    private final LotterySupplierRepository lotterySupplierRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final AllocationBatchRepository allocationBatchRepository;
    private final ReturnBatchPersistenceMapper returnBatchPersistenceMapper;

    @Override
    public ReturnBatchModel save(ReturnBatchModel model) {
        ReturnBatchEntity entity;
        if (model.getId() == null) {
            entity = returnBatchPersistenceMapper.toEntity(model);
        } else {
            entity = returnBatchRepository.findById(model.getId()).orElseThrow();
            returnBatchPersistenceMapper.updateEntityFromModel(model, entity);
        }
        if (model.getLotterySupplierId() != null) {
            lotterySupplierRepository.findById(model.getLotterySupplierId())
                    .ifPresent(entity::setLotterySupplier);
        }
        if (model.getSourceAllocationBatchId() != null) {
            allocationBatchRepository.findById(model.getSourceAllocationBatchId())
                    .ifPresent(entity::setSourceAllocationBatch);
        }
        ReturnBatchEntity saved = returnBatchRepository.save(entity);
        // Reload with lines for consistent domain mapping.
        return returnBatchRepository.findByIdAndDeletedAtIsNull(saved.getId())
                .map(returnBatchPersistenceMapper::toDomain)
                .orElseGet(() -> returnBatchPersistenceMapper.toDomain(saved));
    }

    @Override
    public ReturnBatchLineModel saveLine(ReturnBatchLineModel model) {
        ReturnBatchLineEntity entity;
        if (model.getId() == null) {
            entity = returnBatchPersistenceMapper.toLineEntity(model);
        } else {
            entity = returnBatchLineRepository.findById(model.getId()).orElseThrow();
            returnBatchPersistenceMapper.updateLineEntityFromModel(model, entity);
        }
        if (model.getReturnBatchId() != null) {
            returnBatchRepository.findById(model.getReturnBatchId())
                    .ifPresent(entity::setReturnBatch);
        }
        if (model.getLotteryStationId() != null) {
            lotteryStationRepository.findById(model.getLotteryStationId())
                    .ifPresent(entity::setLotteryStation);
        }
        return returnBatchPersistenceMapper.toLineDomain(returnBatchLineRepository.save(entity));
    }

    @Override
    public Optional<ReturnBatchModel> findById(Long id) {
        return returnBatchRepository.findByIdAndDeletedAtIsNull(id)
                .map(entity -> {
                    // Ensure lines are loaded
                    entity.getLines().size();
                    return returnBatchPersistenceMapper.toDomain(entity);
                });
    }

    @Override
    public Optional<ReturnBatchLineModel> findLineById(Long lineId) {
        return returnBatchLineRepository.findByIdAndDeletedAtIsNull(lineId)
                .map(returnBatchPersistenceMapper::toLineDomain);
    }

    @Override
    public Optional<ReturnBatchModel> findPendingBySupplierAndDrawDate(Long supplierId, LocalDate drawDate) {
        return returnBatchRepository
                .findByLotterySupplier_IdAndDrawDateAndStatusAndDeletedAtIsNull(
                        supplierId, drawDate, ReturnBatchStatus.PENDING_INSPECTION
                )
                .map(returnBatchPersistenceMapper::toDomain);
    }

    @Override
    public Optional<ReturnBatchModel> findBySupplierAndDrawDate(Long supplierId, LocalDate drawDate) {
        return returnBatchRepository
                .findByLotterySupplier_IdAndDrawDateAndDeletedAtIsNull(supplierId, drawDate)
                .map(returnBatchPersistenceMapper::toDomain);
    }

    @Override
    public Optional<ReturnBatchModel> findStreetAgentByAllocationBatchId(Long allocationBatchId) {
        if (allocationBatchId == null) {
            return Optional.empty();
        }
        return returnBatchRepository.findBySourceAllocationBatch_IdAndDeletedAtIsNull(allocationBatchId)
                .map(entity -> {
                    entity.getLines().size();
                    return returnBatchPersistenceMapper.toDomain(entity);
                });
    }

    @Override
    public Page<ReturnBatchModel> findAll(
            Pageable pageable,
            Long lotterySupplierId,
            Long supplierSettlementId,
            ReturnBatchType returnBatchType,
            ReturnBatchStatus status,
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            String search
    ) {
        return returnBatchRepository
                .findAll(
                        ReturnBatchSpecification.filter(
                                lotterySupplierId,
                                supplierSettlementId,
                                returnBatchType,
                                status,
                                drawDateFrom,
                                drawDateTo,
                                search
                        ),
                        pageable
                )
                .map(returnBatchPersistenceMapper::toDomain);
    }

    @Override
    public List<ReturnBatchLineModel> findLinesByBatchId(Long returnBatchId) {
        return returnBatchLineRepository.findByReturnBatch_IdAndDeletedAtIsNull(returnBatchId).stream()
                .map(returnBatchPersistenceMapper::toLineDomain)
                .toList();
    }

    @Override
    public List<ReturnBatchModel> findByStatuses(List<ReturnBatchStatus> statuses) {
        if (statuses == null || statuses.isEmpty()) {
            return List.of();
        }
        return returnBatchRepository.findByStatusInAndDeletedAtIsNull(statuses).stream()
                .map(entity -> {
                    entity.getLines().size();
                    return returnBatchPersistenceMapper.toDomain(entity);
                })
                .toList();
    }

    @Override
    public List<ReturnBatchModel> findBySupplierSettlementId(Long supplierSettlementId) {
        if (supplierSettlementId == null) {
            return List.of();
        }
        return returnBatchRepository
                .findBySupplierSettlementIdAndDeletedAtIsNullOrderByDrawDateDescIdDesc(supplierSettlementId)
                .stream()
                .map(entity -> {
                    entity.getLines().size();
                    return returnBatchPersistenceMapper.toDomain(entity);
                })
                .toList();
    }

    @Override
    public long nextHeaderBatchCodeSequence() {
        return returnBatchRepository.nextHeaderBatchCodeSequence();
    }
}
