package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface LotteryTicketSerialRepository extends JpaRepository<LotteryTicketSerialEntity, Long> {

    Optional<LotteryTicketSerialEntity> findFirstByTicket_IdAndDeletedAtIsNullOrderByIdAsc(Long ticketId);

    @Query("""
            SELECT s FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.ticket.id = :ticketId
              AND (s.ticketCondition IS NULL
                   OR s.ticketCondition <> com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED)
            ORDER BY s.id ASC
            """)
    Optional<LotteryTicketSerialEntity> findFirstVisibleByTicketId(@Param("ticketId") Long ticketId);

    List<LotteryTicketSerialEntity> findByTicket_IdAndDeletedAtIsNull(Long ticketId);

    List<LotteryTicketSerialEntity> findByTicket_IdInAndDeletedAtIsNullOrderByTicket_IdAscIdAsc(List<Long> ticketIds);

    Optional<LotteryTicketSerialEntity> findFirstByTicket_IdAndStatusAndDeletedAtIsNullOrderByIdAsc(
            Long ticketId,
            LotteryTicketSerialStatus status
    );

    boolean existsByTicket_IdAndSerialNumberAndDeletedAtIsNull(Long ticketId, String serialNumber);

    Optional<LotteryTicketSerialEntity> findFirstBySerialNumberAndDeletedAtIsNull(String serialNumber);

    List<LotteryTicketSerialEntity> findBySerialNumberStartingWithAndDeletedAtIsNull(String serialNumberPrefix);

    List<LotteryTicketSerialEntity> findBySerialNumberStartingWith(String serialNumberPrefix);

    List<LotteryTicketSerialEntity> findByImportBatchLine_IdIn(Collection<Long> importBatchLineIds);

    List<LotteryTicketSerialEntity> findByImportBatch_Id(Long importBatchId);

    @Query("""
            SELECT s FROM LotteryTicketSerialEntity s
            JOIN FETCH s.ticket t
            JOIN FETCH t.station
            WHERE s.deletedAt IS NULL
              AND s.serialNumber LIKE CONCAT(:prefix, '%')
            """)
    List<LotteryTicketSerialEntity> findBySerialNumberPrefixWithTicketFetched(@Param("prefix") String prefix);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE LotteryTicketSerialEntity s
            SET s.replacedForTicketId = NULL
            WHERE s.replacedForTicketId IN :serialIds
            """)
    int clearReplacedForTicketIdRefs(@Param("serialIds") Collection<Long> serialIds);

    @Query("""
            SELECT COUNT(s) FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.ticket.id = :ticketId
              AND s.status IN :statuses
              AND (s.ticketCondition IS NULL
                   OR s.ticketCondition <> com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED)
            """)
    long countByTicket_IdAndStatusInAndDeletedAtIsNull(
            @Param("ticketId") Long ticketId,
            @Param("statuses") Collection<LotteryTicketSerialStatus> statuses
    );

    @Query("""
            SELECT COUNT(s) FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.ticket.id = :ticketId
              AND s.status = com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK
              AND s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
              AND s.returnBatchLineId IS NULL
            """)
    long countSellableByTicketId(@Param("ticketId") Long ticketId);

    @Query("""
            SELECT s.ticket.id, COUNT(s)
            FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.ticket.id IN :ticketIds
              AND s.status IN :statuses
              AND (s.ticketCondition IS NULL
                   OR s.ticketCondition <> com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED)
            GROUP BY s.ticket.id
            """)
    List<Object[]> countGroupedByTicketIdAndStatuses(
            @Param("ticketIds") Collection<Long> ticketIds,
            @Param("statuses") Collection<LotteryTicketSerialStatus> statuses
    );

    @Query("""
            SELECT s.ticket.id, COUNT(s)
            FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.ticket.id IN :ticketIds
              AND s.status = com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK
              AND s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
              AND s.returnBatchLineId IS NULL
            GROUP BY s.ticket.id
            """)
    List<Object[]> countSellableGroupedByTicketId(@Param("ticketIds") Collection<Long> ticketIds);

    @Query("""
            SELECT s.ticket.id, COUNT(s)
            FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.ticket.id IN :ticketIds
              AND (s.ticketCondition IS NULL
                   OR s.ticketCondition <> com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED)
            GROUP BY s.ticket.id
            """)
    List<Object[]> countGroupedByTicketId(@Param("ticketIds") Collection<Long> ticketIds);

    List<LotteryTicketSerialEntity> findByTicket_IdAndStatusInAndDeletedAtIsNull(Long ticketId, Collection<LotteryTicketSerialStatus> statuses);

    @Query("""
            SELECT COUNT(s) FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL 
              AND s.importBatchLine.id = :importBatchLineId
              AND (s.ticketCondition IS NULL OR s.ticketCondition <> com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED)
            """)
    long countByImportBatchLineId(@Param("importBatchLineId") Long importBatchLineId);

    @Query("""
            SELECT COUNT(s) FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.importBatchLine.id = :importBatchLineId
              AND s.status = :status
              AND (s.ticketCondition IS NULL
                   OR s.ticketCondition <> com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED)
            """)
    long countByImportBatchLineIdAndStatus(
            @Param("importBatchLineId") Long importBatchLineId,
            @Param("status") LotteryTicketSerialStatus status
    );

    @Query("""
            SELECT COUNT(s) FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.importBatchLine.id = :importBatchLineId
              AND s.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK,
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.EXPIRED
              )
              AND (s.ticketCondition IS NULL
                   OR s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD)
              AND s.returnBatchLineId IS NULL
            """)
    long countReturnEligibleByImportBatchLineId(@Param("importBatchLineId") Long importBatchLineId);

    @Query("""
            SELECT DISTINCT s.ticket.id FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.importBatchLine.id = :importBatchLineId
              AND (s.ticketCondition IS NULL
                   OR s.ticketCondition <> com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED)
            """)
    List<Long> findDistinctTicketIdsByImportBatchLineId(@Param("importBatchLineId") Long importBatchLineId);

    @Query("""
            SELECT s FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL AND s.importBatchLine.id = :importBatchLineId
            """)
    List<LotteryTicketSerialEntity> findAllByImportBatchLineId(@Param("importBatchLineId") Long importBatchLineId);

    @Query("""
            SELECT COUNT(s) FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.ticket.id = :ticketId
              AND s.importBatchLine.id = :importBatchLineId
              AND (s.ticketCondition IS NULL OR s.ticketCondition <> com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED)
            """)
    long countByTicketIdAndImportBatchLineId(
            @Param("ticketId") Long ticketId,
            @Param("importBatchLineId") Long importBatchLineId
    );

    void deleteByTicket_IdAndImportBatchLine_Id(Long ticketId, Long importBatchLineId);

    void deleteByImportBatchLine_Id(Long importBatchLineId);

    @Query("""
            SELECT s FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.status = :status
              AND s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
              AND s.returnBatchLineId IS NULL
              AND s.ticket.station.id = :stationId
              AND s.ticket.numbers = :numbers
              AND s.ticket.drawDate = :drawDate
            """)
    List<LotteryTicketSerialEntity> findAllReplacementCandidates(
            @Param("stationId") Long stationId,
            @Param("numbers") String numbers,
            @Param("drawDate") java.time.LocalDate drawDate,
            @Param("status") LotteryTicketSerialStatus status
    );

    List<LotteryTicketSerialEntity> findByIdInAndDeletedAtIsNull(Collection<Long> ids);

    @Query("""
            select s from LotteryTicketSerialEntity s
            join fetch s.ticket t
            join fetch t.station st
            where s.deletedAt is null
              and s.status = com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK
              and s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
              and s.returnBatchLineId is null
              and t.drawDate = :drawDate
              and t.deletedAt is null
              and t.active = true
              and t.status <> com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus.EXPIRED
              and st.deletedAt is null
              and st.isActive = true
            order by st.name asc, t.numbers asc, s.serialNumber asc
            """)
    List<LotteryTicketSerialEntity> findVendorAllocationCandidates(@Param("drawDate") java.time.LocalDate drawDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from LotteryTicketSerialEntity s join fetch s.ticket t join fetch t.station where s.id in :ids and s.deletedAt is null order by s.id asc")
    List<LotteryTicketSerialEntity> findAllByIdForAllocationUpdate(@Param("ids") Collection<Long> ids);

    /** Locks every currently sellable serial of affected stations while counter reserve is evaluated. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select s from LotteryTicketSerialEntity s join fetch s.ticket t join fetch t.station st
            where s.deletedAt is null and s.status = com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK
              and s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
              and s.returnBatchLineId is null and t.drawDate = :drawDate and t.deletedAt is null
              and t.active = true and t.status <> com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus.EXPIRED
              and st.deletedAt is null and st.isActive = true and st.id in :stationIds
            order by st.id asc, t.numbers asc, s.id asc
            """)
    List<LotteryTicketSerialEntity> lockVendorAllocationCandidatesForStations(
            @Param("drawDate") java.time.LocalDate drawDate, @Param("stationIds") Collection<Long> stationIds);

    List<LotteryTicketSerialEntity> findByReturnBatchLineIdAndDeletedAtIsNull(Long returnBatchLineId);

    List<LotteryTicketSerialEntity> findByReturnBatchLineIdInAndDeletedAtIsNull(Collection<Long> returnBatchLineIds);

    long countByReturnBatchLineIdAndDeletedAtIsNull(Long returnBatchLineId);

    @Query("""
            SELECT COALESCE(SUM(ibl.importCost), 0)
            FROM LotteryTicketSerialEntity s
            JOIN s.importBatchLine ibl
            WHERE s.deletedAt IS NULL
              AND s.returnBatchLineId = :returnBatchLineId
            """)
    java.math.BigDecimal sumImportCostByReturnBatchLineId(@Param("returnBatchLineId") Long returnBatchLineId);

    @Query("""
            SELECT s FROM LotteryTicketSerialEntity s
            JOIN FETCH s.ticket t
            JOIN FETCH t.station st
            JOIN FETCH s.importBatchLine ibl
            JOIN ibl.importBatch b
            WHERE s.deletedAt IS NULL
              AND t.deletedAt IS NULL
              AND b.deletedAt IS NULL
              AND b.supplier.id = :supplierId
              AND t.drawDate = :drawDate
              AND s.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK,
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.EXPIRED
              )
              AND (s.ticketCondition IS NULL
                   OR s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD)
              AND s.returnBatchLineId IS NULL
              AND (:stationIdsEmpty = true OR st.id IN :stationIds)
            ORDER BY st.name ASC, t.numbers ASC, s.serialNumber ASC
            """)
    List<LotteryTicketSerialEntity> findInStockForSupplierAndDrawDate(
            @Param("supplierId") Long supplierId,
            @Param("drawDate") java.time.LocalDate drawDate,
            @Param("stationIds") Collection<Long> stationIds,
            @Param("stationIdsEmpty") boolean stationIdsEmpty
    );

    @Query("""
            SELECT COUNT(s) FROM LotteryTicketSerialEntity s
            JOIN s.ticket t
            JOIN t.station st
            JOIN s.importBatchLine ibl
            JOIN ibl.importBatch b
            WHERE s.deletedAt IS NULL
              AND t.deletedAt IS NULL
              AND b.deletedAt IS NULL
              AND b.supplier.id = :supplierId
              AND t.drawDate = :drawDate
              AND s.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK,
                  com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.EXPIRED
              )
              AND (s.ticketCondition IS NULL
                   OR s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD)
              AND s.returnBatchLineId IS NULL
              AND (:stationIdsEmpty = true OR st.id IN :stationIds)
            """)
    long countReturnEligibleForSupplierAndDrawDate(
            @Param("supplierId") Long supplierId,
            @Param("drawDate") java.time.LocalDate drawDate,
            @Param("stationIds") Collection<Long> stationIds,
            @Param("stationIdsEmpty") boolean stationIdsEmpty
    );

    @Query("""
            SELECT
                st.id,
                st.name,
                SUM(CASE WHEN s.ticketCondition IS NULL
                           OR s.ticketCondition <> com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED
                         THEN 1 ELSE 0 END),
                SUM(CASE WHEN EXISTS (
                    SELECT 1 FROM OrderEntity o
                    JOIN o.orderDetails od
                    WHERE (
                           od.lotteryTicketSerial = s 
                        OR od.replacedByTicketSerial = s 
                    )
                    AND od.status IN (
                          com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus.PROXY_HOLDING,
                          com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus.HANDOVER_IN_PROGRESS,
                          com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus.HANDED_OVER
                    )
                    AND o.status IN (
                          com.daiphat.coreapi.domain.model.enums.order.OrderStatus.PAID,
                          com.daiphat.coreapi.domain.model.enums.order.OrderStatus.PREPARING,
                          com.daiphat.coreapi.domain.model.enums.order.OrderStatus.PENDING_PICKUP,
                          com.daiphat.coreapi.domain.model.enums.order.OrderStatus.COMPLETED
                    )
                ) THEN 1 ELSE 0 END),
                SUM(CASE WHEN s.status = com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.IN_STOCK
                           AND s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.GOOD
                           AND s.returnBatchLineId IS NULL
                         THEN 1 ELSE 0 END),
                SUM(CASE WHEN s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.DAMAGED
                         THEN 1 ELSE 0 END),
                SUM(CASE WHEN s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.LOST
                         THEN 1 ELSE 0 END),
                SUM(CASE WHEN s.ticketCondition = com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED
                         THEN 1 ELSE 0 END),
                SUM(CASE WHEN s.returnBatchLineId IS NOT NULL THEN 1 ELSE 0 END),
                COALESCE(SUM(CASE WHEN s.returnBatchLineId IS NOT NULL THEN ibl.importCost ELSE 0 END), 0)
            FROM LotteryTicketSerialEntity s
            JOIN s.importBatchLine ibl
            JOIN ibl.importBatch b
            JOIN s.ticket t
            JOIN t.station st
            WHERE s.deletedAt IS NULL
              AND b.deletedAt IS NULL
              AND ibl.deletedAt IS NULL
              AND t.deletedAt IS NULL
              AND b.supplierSettlementId = :settlementId
            GROUP BY st.id, st.name
            ORDER BY st.name ASC
            """)
    List<Object[]> aggregateInventoryByStationForSettlement(@Param("settlementId") Long settlementId);
}
