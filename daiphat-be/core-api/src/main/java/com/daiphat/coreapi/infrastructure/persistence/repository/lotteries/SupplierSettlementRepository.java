package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

public interface SupplierSettlementRepository
        extends JpaRepository<SupplierSettlementEntity, Long>, JpaSpecificationExecutor<SupplierSettlementEntity> {

    Optional<SupplierSettlementEntity> findByLotterySupplier_IdAndPeriodFromAndDeletedAtIsNull(
            Long lotterySupplierId,
            LocalDate periodFrom
    );

    Optional<SupplierSettlementEntity> findByIdAndDeletedAtIsNull(Long id);

    @Query("""
            SELECT COALESCE(SUM(l.importCost * l.totalQuantity), 0)
            FROM ImportBatchLineEntity l
            JOIN l.importBatch b
            WHERE b.supplierSettlementId = :settlementId
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
            """)
    BigDecimal sumImportedCostValueBySettlementId(@Param("settlementId") Long settlementId);

    @Query("""
            SELECT COALESCE(SUM(l.totalReturnValue), 0)
            FROM ReturnBatchLineEntity l
            JOIN l.returnBatch b
            WHERE b.supplierSettlementId = :settlementId
              AND l.status = com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus.SUCCESS
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
            """)
    BigDecimal sumSuccessfulReturnValueBySettlementId(@Param("settlementId") Long settlementId);
}
