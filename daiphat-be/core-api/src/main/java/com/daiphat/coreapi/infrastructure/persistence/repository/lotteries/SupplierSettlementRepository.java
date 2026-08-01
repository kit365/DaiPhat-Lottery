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

    /**
     * Import cost of unsold tickets prepared for return (inspected / attached):
     * serial status {@code PENDING_RETURN} or {@code RETURNED}.
     * Does not wait for return-line {@code SUCCESS} / full supplier handover.
     */
    @Query("""
            SELECT COALESCE(SUM(ibl.importCost), 0)
            FROM LotteryTicketSerialEntity s
            JOIN ReturnBatchLineEntity l ON s.returnBatchLineId = l.id
            JOIN l.returnBatch b
            JOIN s.importBatchLine ibl
            WHERE b.supplierSettlementId = :settlementId
              AND s.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.PENDING_RETURN,
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.RETURNED
              )
              AND s.deletedAt IS NULL
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
              AND ibl.deletedAt IS NULL
            """)
    BigDecimal sumPreparedReturnValueBySettlementId(@Param("settlementId") Long settlementId);
}
