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

    long countByTicket_IdAndStatusInAndDeletedAtIsNull(Long ticketId, Collection<LotteryTicketSerialStatus> statuses);

    List<LotteryTicketSerialEntity> findByTicket_IdAndStatusInAndDeletedAtIsNull(Long ticketId, Collection<LotteryTicketSerialStatus> statuses);

    @Query("""
            SELECT COUNT(s) FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL AND s.importBatchLine.id = :importBatchLineId
            """)
    long countByImportBatchLineId(@Param("importBatchLineId") Long importBatchLineId);

    @Query("""
            SELECT DISTINCT s.ticket.id FROM LotteryTicketSerialEntity s
            WHERE s.deletedAt IS NULL AND s.importBatchLine.id = :importBatchLineId
            """)
    List<Long> findDistinctTicketIdsByImportBatchLineId(@Param("importBatchLineId") Long importBatchLineId);
}
