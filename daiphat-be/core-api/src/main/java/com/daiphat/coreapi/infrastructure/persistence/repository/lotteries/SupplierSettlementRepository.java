package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
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

    java.util.List<SupplierSettlementEntity> findByStatusAndDeletedAtIsNull(SupplierSettlementStatus status);

    java.util.List<SupplierSettlementEntity> findByStatusInAndDeletedAtIsNull(
            java.util.Collection<SupplierSettlementStatus> statuses
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
     * Import cost of tickets handed over (or received) by the supplier, linked through a settlement's return batches.
     */
    @Query("""
            SELECT COALESCE(SUM(ibl.importCost), 0)
            FROM LotteryTicketSerialEntity s
            JOIN ReturnBatchLineEntity l ON s.returnBatchLineId = l.id
            JOIN l.returnBatch b
            JOIN s.importBatchLine ibl
            WHERE b.supplierSettlementId = :settlementId
              AND s.returnBatchLineId IS NOT NULL
              AND s.deletedAt IS NULL
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
              AND ibl.deletedAt IS NULL
              AND b.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus.HANDED_OVER,
                  com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus.RECEIVED
              )
              AND s.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK,
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.EXPIRED
              )
              AND s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
            """)
    BigDecimal sumPreparedReturnValueBySettlementId(@Param("settlementId") Long settlementId);

    @Query("""
            SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END
            FROM ReturnBatchEntity b
            WHERE b.supplierSettlementId = :settlementId
              AND b.deletedAt IS NULL
              AND b.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus.HANDED_OVER,
                  com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus.RECEIVED
              )
            """)
    boolean existsCompletedInspectionReturnBatch(@Param("settlementId") Long settlementId);

    @Query("""
            SELECT COALESCE(SUM(ibl.importCost), 0)
            FROM LotteryTicketSerialEntity s
            JOIN s.importBatchLine ibl
            JOIN ibl.importBatch b
            WHERE b.supplierSettlementId = :settlementId
              AND s.deletedAt IS NULL
              AND ibl.deletedAt IS NULL
              AND b.deletedAt IS NULL
              AND s.status = com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK
              AND s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
            """)
    BigDecimal sumInStockGoodImportCostBySettlementId(@Param("settlementId") Long settlementId);

    @Query("""
            SELECT COALESCE(SUM(ibl.importCost), 0)
            FROM LotteryTicketSerialEntity s
            JOIN s.importBatchLine ibl
            JOIN ibl.importBatch ib
            JOIN s.ticket t
            WHERE ib.supplierSettlementId = :settlementId
              AND s.deletedAt IS NULL
              AND ibl.deletedAt IS NULL
              AND ib.deletedAt IS NULL
              AND t.deletedAt IS NULL
              AND s.status = com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.EXPIRED
              AND NOT EXISTS (
                  SELECT 1 FROM OrderDetailEntity od
                  WHERE od.lotteryTicketSerial = s
                     OR od.replacedByTicketSerial = s
              )
            """)
    BigDecimal sumExpiredReturnValueBySettlementId(@Param("settlementId") Long settlementId);

    @Query("""
            SELECT COUNT(s.id)
            FROM LotteryTicketSerialEntity s
            JOIN s.importBatchLine ibl
            JOIN ibl.importBatch ib
            JOIN s.ticket t
            WHERE ib.supplierSettlementId = :settlementId
              AND s.deletedAt IS NULL
              AND ibl.deletedAt IS NULL
              AND ib.deletedAt IS NULL
              AND t.deletedAt IS NULL
              AND s.status = com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.EXPIRED
              AND NOT EXISTS (
                  SELECT 1 FROM OrderDetailEntity od
                  WHERE od.lotteryTicketSerial = s
                     OR od.replacedByTicketSerial = s
              )
            """)
    long countExpiredReturnTicketsBySettlementId(@Param("settlementId") Long settlementId);

    @Query("""
            SELECT COUNT(s.id)
            FROM LotteryTicketSerialEntity s
            JOIN s.importBatchLine ibl
            JOIN ibl.importBatch ib
            WHERE ib.supplierSettlementId = :settlementId
              AND s.deletedAt IS NULL
              AND ibl.deletedAt IS NULL
              AND ib.deletedAt IS NULL
              AND s.ticketCondition <> com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED
            """)
    long countImportedTicketsBySettlementId(@Param("settlementId") Long settlementId);

    @Query("""
            SELECT COUNT(s.id)
            FROM LotteryTicketSerialEntity s
            JOIN ReturnBatchLineEntity l ON s.returnBatchLineId = l.id
            JOIN l.returnBatch b
            WHERE b.supplierSettlementId = :settlementId
              AND s.returnBatchLineId IS NOT NULL
              AND s.deletedAt IS NULL
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
              AND b.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus.HANDED_OVER,
                  com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus.RECEIVED
              )
              AND s.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK,
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.EXPIRED
              )
              AND s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
            """)
    long countPreparedReturnTicketsBySettlementId(@Param("settlementId") Long settlementId);

    /**
     * Prepared-return serials for missing-return resolution UI.
     * Columns: serialId, serialNumber, status, ticketCondition, stationName, importCost
     */
    @Query("""
            SELECT s.id,
                   s.serialNumber,
                   s.status,
                   s.ticketCondition,
                   st.name,
                   ibl.importCost
            FROM LotteryTicketSerialEntity s
            JOIN ReturnBatchLineEntity l ON s.returnBatchLineId = l.id
            JOIN l.returnBatch b
            JOIN s.importBatchLine ibl
            JOIN s.ticket t
            JOIN t.station st
            WHERE b.supplierSettlementId = :settlementId
              AND s.returnBatchLineId IS NOT NULL
              AND s.deletedAt IS NULL
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
              AND ibl.deletedAt IS NULL
              AND t.deletedAt IS NULL
              AND b.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus.PENDING_HANDOVER,
                  com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus.HANDED_OVER
              )
              AND s.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK,
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.EXPIRED
              )
              AND s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
            ORDER BY st.name ASC, s.serialNumber ASC
            """)
    java.util.List<Object[]> findPreparedReturnSerialRowsBySettlementId(@Param("settlementId") Long settlementId);

    /**
     * IN_STOCK|EXPIRED + GOOD serials not yet on a return batch, for import discrepancy
     * resolution / excess-return selection / inventory browse.
     * Columns: serialId, serialNumber, status, ticketCondition, stationName, importCost,
     *          importBatchId, importBatchCode
     */
    @Query("""
            SELECT s.id,
                   s.serialNumber,
                   s.status,
                   s.ticketCondition,
                   st.name,
                   ibl.importCost,
                   ib.id,
                   ib.batchCode
            FROM LotteryTicketSerialEntity s
            JOIN s.importBatchLine ibl
            JOIN ibl.importBatch ib
            JOIN s.ticket t
            JOIN t.station st
            WHERE ib.supplierSettlementId = :settlementId
              AND s.deletedAt IS NULL
              AND ibl.deletedAt IS NULL
              AND ib.deletedAt IS NULL
              AND t.deletedAt IS NULL
              AND s.returnBatchLineId IS NULL
              AND s.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK,
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.EXPIRED
              )
              AND (s.ticketCondition IS NULL
                   OR s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD)
            ORDER BY ib.id ASC, st.name ASC, s.serialNumber ASC
            """)
    java.util.List<Object[]> findImportResolvableSerialRowsBySettlementId(@Param("settlementId") Long settlementId);

    /**
     * Every imported serial of the settlement (not only IN_STOCK/GOOD), for file vs system check.
     * Columns: serialId, serialNumber, numbers, lotteryStationId, stationName, importBatchId, importBatchCode
     */
    @Query("""
            SELECT s.id,
                   s.serialNumber,
                   t.numbers,
                   st.id,
                   st.name,
                   ib.id,
                   ib.batchCode
            FROM LotteryTicketSerialEntity s
            JOIN s.importBatchLine ibl
            JOIN ibl.importBatch ib
            JOIN s.ticket t
            JOIN t.station st
            WHERE ib.supplierSettlementId = :settlementId
              AND s.deletedAt IS NULL
              AND ibl.deletedAt IS NULL
              AND ib.deletedAt IS NULL
              AND t.deletedAt IS NULL
            ORDER BY ib.id ASC, st.name ASC, s.serialNumber ASC
            """)
    java.util.List<Object[]> findImportedSerialRowsForFileCheck(@Param("settlementId") Long settlementId);

    @Query(value = "SELECT nextval('supplier_settlement_code_seq')", nativeQuery = true)
    long nextSettlementCodeSequence();
}
