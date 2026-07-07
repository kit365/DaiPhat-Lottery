package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntryDraftEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LotteryTicketEntryDraftRepository extends JpaRepository<LotteryTicketEntryDraftEntity, Long> {

    @Query("""
            SELECT d FROM LotteryTicketEntryDraftEntity d
            JOIN FETCH d.importBatchLine l
            WHERE l.importBatch.id = :importBatchId
              AND d.operator.id = :operatorId
              AND d.deletedAt IS NULL
              AND l.deletedAt IS NULL
            """)
    List<LotteryTicketEntryDraftEntity> findActiveByImportBatchIdAndOperatorId(
            @Param("importBatchId") Long importBatchId,
            @Param("operatorId") UUID operatorId
    );

    @Query("""
            SELECT d FROM LotteryTicketEntryDraftEntity d
            JOIN FETCH d.importBatchLine l
            WHERE l.id = :importBatchLineId
              AND d.operator.id = :operatorId
              AND d.deletedAt IS NULL
            """)
    Optional<LotteryTicketEntryDraftEntity> findActiveByImportBatchLineIdAndOperatorId(
            @Param("importBatchLineId") Long importBatchLineId,
            @Param("operatorId") UUID operatorId
    );

    Optional<LotteryTicketEntryDraftEntity> findFirstByImportBatchLine_IdAndOperator_IdOrderByUpdatedAtDesc(
            Long importBatchLineId,
            UUID operatorId
    );
}
