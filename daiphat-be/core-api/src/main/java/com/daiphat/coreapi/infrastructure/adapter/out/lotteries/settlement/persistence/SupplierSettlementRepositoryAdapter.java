package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.settlement.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.SettlementResolvableSerialRow;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.SupplierSettlementPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.lotteries.SupplierSettlementSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class SupplierSettlementRepositoryAdapter implements SupplierSettlementRepositoryPort {

    private final SupplierSettlementRepository supplierSettlementRepository;
    private final LotterySupplierRepository lotterySupplierRepository;
    private final SupplierSettlementPersistenceMapper supplierSettlementPersistenceMapper;

    @Override
    public SupplierSettlementModel save(SupplierSettlementModel model) {
        SupplierSettlementEntity entity;
        if (model.getId() == null) {
            entity = supplierSettlementPersistenceMapper.toEntity(model);
        } else {
            entity = supplierSettlementRepository.findById(model.getId()).orElseThrow();
            supplierSettlementPersistenceMapper.updateEntityFromModel(model, entity);
        }
        if (model.getLotterySupplierId() != null) {
            lotterySupplierRepository.findById(model.getLotterySupplierId())
                    .ifPresent(entity::setLotterySupplier);
        }
        return supplierSettlementPersistenceMapper.toDomain(supplierSettlementRepository.save(entity));
    }

    @Override
    public Optional<SupplierSettlementModel> findById(Long id) {
        return supplierSettlementRepository.findByIdAndDeletedAtIsNull(id)
                .map(supplierSettlementPersistenceMapper::toDomain);
    }

    @Override
    public Optional<SupplierSettlementModel> findBySupplierIdAndPeriodFrom(Long supplierId, LocalDate periodFrom) {
        return supplierSettlementRepository
                .findByLotterySupplier_IdAndPeriodFromAndDeletedAtIsNull(supplierId, periodFrom)
                .map(supplierSettlementPersistenceMapper::toDomain);
    }

    @Override
    public java.util.List<SupplierSettlementModel> findByStatus(SupplierSettlementStatus status) {
        return supplierSettlementRepository.findByStatusAndDeletedAtIsNull(status).stream()
                .map(supplierSettlementPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public java.util.List<SupplierSettlementModel> findByStatuses(
            java.util.Collection<SupplierSettlementStatus> statuses
    ) {
        if (statuses == null || statuses.isEmpty()) {
            return java.util.List.of();
        }
        return supplierSettlementRepository.findByStatusInAndDeletedAtIsNull(statuses).stream()
                .map(supplierSettlementPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Page<SupplierSettlementModel> findAll(
            Pageable pageable,
            Long lotterySupplierId,
            SupplierSettlementStatus status,
            LocalDate periodFrom,
            LocalDate periodTo,
            String search
    ) {
        return supplierSettlementRepository
                .findAll(
                        SupplierSettlementSpecification.filter(
                                lotterySupplierId,
                                status,
                                periodFrom,
                                periodTo,
                                search
                        ),
                        pageable
                )
                .map(supplierSettlementPersistenceMapper::toDomain);
    }

    @Override
    public BigDecimal sumImportedCostValueBySettlementId(Long settlementId) {
        BigDecimal sum = supplierSettlementRepository.sumImportedCostValueBySettlementId(settlementId);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    @Override
    public BigDecimal sumPreparedReturnValueBySettlementId(Long settlementId) {
        BigDecimal sum = supplierSettlementRepository.sumPreparedReturnValueBySettlementId(settlementId);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    @Override
    public boolean existsCompletedInspectionReturnBatch(Long settlementId) {
        if (settlementId == null) {
            return false;
        }
        return supplierSettlementRepository.existsCompletedInspectionReturnBatch(settlementId);
    }

    @Override
    public BigDecimal sumInStockGoodImportCostBySettlementId(Long settlementId) {
        BigDecimal sum = supplierSettlementRepository.sumInStockGoodImportCostBySettlementId(settlementId);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    @Override
    public BigDecimal sumExpiredReturnValueBySettlementId(Long settlementId) {
        BigDecimal sum = supplierSettlementRepository.sumExpiredReturnValueBySettlementId(settlementId);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    @Override
    public long countExpiredReturnTicketsBySettlementId(Long settlementId) {
        if (settlementId == null) {
            return 0L;
        }
        return supplierSettlementRepository.countExpiredReturnTicketsBySettlementId(settlementId);
    }

    @Override
    public long countImportedTicketsBySettlementId(Long settlementId) {
        if (settlementId == null) {
            return 0L;
        }
        return supplierSettlementRepository.countImportedTicketsBySettlementId(settlementId);
    }

    @Override
    public long countPreparedReturnTicketsBySettlementId(Long settlementId) {
        if (settlementId == null) {
            return 0L;
        }
        return supplierSettlementRepository.countPreparedReturnTicketsBySettlementId(settlementId);
    }

    @Override
    public java.util.List<SettlementResolvableSerialRow> findPreparedReturnSerialsBySettlementId(Long settlementId) {
        if (settlementId == null) {
            return java.util.List.of();
        }
        return mapSerialRows(supplierSettlementRepository.findPreparedReturnSerialRowsBySettlementId(settlementId));
    }

    @Override
    public java.util.List<SettlementResolvableSerialRow> findImportResolvableSerialsBySettlementId(Long settlementId) {
        if (settlementId == null) {
            return java.util.List.of();
        }
        return mapSerialRows(supplierSettlementRepository.findImportResolvableSerialRowsBySettlementId(settlementId));
    }

    @Override
    public long nextSettlementCodeSequence() {
        return supplierSettlementRepository.nextSettlementCodeSequence();
    }

    private java.util.List<SettlementResolvableSerialRow> mapSerialRows(java.util.List<Object[]> rows) {
        return rows.stream()
                .map(row -> new SettlementResolvableSerialRow(
                        (Long) row[0],
                        (String) row[1],
                        (LotteryTicketSerialStatus) row[2],
                        (TicketCondition) row[3],
                        (String) row[4],
                        row[5] != null ? (BigDecimal) row[5] : BigDecimal.ZERO
                ))
                .toList();
    }
}
