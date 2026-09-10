package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionLineEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrizeClaimSubmissionLineRepository extends JpaRepository<PrizeClaimSubmissionLineEntity, Long> {

    List<PrizeClaimSubmissionLineEntity> findByPrizeClaimSubmissionId(Long submissionId);

    Optional<PrizeClaimSubmissionLineEntity> findByIdAndPrizeClaimSubmissionId(Long lineId, Long submissionId);

    long countByPrizeClaimSubmissionIdAndLineStatus(
            Long submissionId,
            PrizeClaimSubmissionLineStatus lineStatus);

    long countBySerialIdAndLineStatus(Long serialId, PrizeClaimSubmissionLineStatus lineStatus);

    @Modifying
    @Query("DELETE FROM PrizeClaimSubmissionLineEntity l WHERE l.prizeClaimSubmission.id = :submissionId")
    void deleteByPrizeClaimSubmissionId(@Param("submissionId") Long submissionId);

    long countByPrizeClaimSubmissionId(Long submissionId);

    @Query("""
            SELECT l FROM PrizeClaimSubmissionLineEntity l
            LEFT JOIN FETCH l.serial
            WHERE l.prizeClaimSubmission.id = :submissionId
            ORDER BY l.id ASC
            """)
    List<PrizeClaimSubmissionLineEntity> findBySubmissionIdWithSerial(@Param("submissionId") Long submissionId);

    @Query("""
            SELECT l.prizeClaimSubmission.id, COUNT(l)
            FROM PrizeClaimSubmissionLineEntity l
            WHERE l.prizeClaimSubmission.id IN :submissionIds
              AND l.lineStatus = :lineStatus
            GROUP BY l.prizeClaimSubmission.id
            """)
    List<Object[]> countBySubmissionIdsAndLineStatus(
            @Param("submissionIds") List<Long> submissionIds,
            @Param("lineStatus") PrizeClaimSubmissionLineStatus lineStatus);

    @Query("""
            SELECT COUNT(DISTINCT s.id)
            FROM PrizeClaimSubmissionEntity s
            JOIN s.lines l
            WHERE s.status = com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus.HANDED_OVER
              AND l.lineStatus = com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus.AWAITING_OUTCOME
            """)
    long countSubmissionsWithPendingOutcome();
}
