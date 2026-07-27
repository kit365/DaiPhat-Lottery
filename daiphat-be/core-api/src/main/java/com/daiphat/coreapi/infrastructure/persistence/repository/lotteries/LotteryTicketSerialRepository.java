package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface LotteryTicketSerialRepository extends JpaRepository<LotteryTicketSerialEntity, Long> {

    Optional<LotteryTicketSerialEntity> findFirstByTicket_IdAndDeletedAtIsNullOrderByIdAsc(Long ticketId);

    List<LotteryTicketSerialEntity> findByTicket_IdAndDeletedAtIsNull(Long ticketId);

    List<LotteryTicketSerialEntity> findByTicket_IdInAndDeletedAtIsNullOrderByTicket_IdAscIdAsc(List<Long> ticketIds);

    Optional<LotteryTicketSerialEntity> findFirstByTicket_IdAndStatusAndDeletedAtIsNullOrderByIdAsc(
            Long ticketId,
            LotteryTicketSerialStatus status
    );

    boolean existsByTicket_IdAndSerialNumberAndDeletedAtIsNull(Long ticketId, String serialNumber);

    Optional<LotteryTicketSerialEntity> findFirstBySerialNumberAndDeletedAtIsNull(String serialNumber);

    List<LotteryTicketSerialEntity> findBySerialNumberStartingWithAndDeletedAtIsNull(String serialNumberPrefix);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE LotteryTicketSerialEntity s
            SET s.replacedForTicketId = NULL
            WHERE s.replacedForTicketId IN :serialIds
            """)
    int clearReplacedForTicketIdRefs(@Param("serialIds") Collection<Long> serialIds);

    long countByTicket_IdAndStatusInAndDeletedAtIsNull(Long ticketId, Collection<LotteryTicketSerialStatus> statuses);

    @Query("""
            SELECT s.ticket.id, COUNT(s)
            FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL
              AND s.ticket.id IN :ticketIds
              AND s.status IN :statuses
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
            GROUP BY s.ticket.id
            """)
    List<Object[]> countGroupedByTicketId(@Param("ticketIds") Collection<Long> ticketIds);

    List<LotteryTicketSerialEntity> findByTicket_IdAndStatusInAndDeletedAtIsNull(Long ticketId, Collection<LotteryTicketSerialStatus> statuses);

    @Query("""
            SELECT COUNT(s) FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL 
              AND s.importBatchLine.id = :importBatchLineId
              AND s.status <> com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.VOIDED
            """)
    long countByImportBatchLineId(@Param("importBatchLineId") Long importBatchLineId);

    @Query("""
            SELECT DISTINCT s.ticket.id FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL AND s.importBatchLine.id = :importBatchLineId
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
              AND s.status <> com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus.VOIDED
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
}
