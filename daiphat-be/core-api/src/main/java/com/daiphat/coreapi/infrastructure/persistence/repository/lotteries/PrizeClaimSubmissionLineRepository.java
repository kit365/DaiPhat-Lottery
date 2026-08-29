package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionLineEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrizeClaimSubmissionLineRepository extends JpaRepository<PrizeClaimSubmissionLineEntity, Long> {

    List<PrizeClaimSubmissionLineEntity> findByPrizeClaimSubmissionId(Long submissionId);

    /**
     * Bulk update line_status → WITHDRAWN khi submission cha bị cancel.
     * Đây là cơ chế giải phóng serial: WITHDRAWN nằm ngoài unique index.
     */
    @Modifying
    @Query("""
            UPDATE PrizeClaimSubmissionLineEntity l
               SET l.lineStatus = :newStatus,
                   l.updatedAt = CURRENT_TIMESTAMP
             WHERE l.prizeClaimSubmission.id = :submissionId
            """)
    int updateLineStatusBySubmissionId(
            @Param("submissionId") Long submissionId,
            @Param("newStatus") PrizeClaimSubmissionLineStatus newStatus);

    long countByPrizeClaimSubmissionId(Long submissionId);

    @Query("""
            SELECT l FROM PrizeClaimSubmissionLineEntity l
            LEFT JOIN FETCH l.serial
            WHERE l.prizeClaimSubmission.id = :submissionId
            ORDER BY l.id ASC
            """)
    List<PrizeClaimSubmissionLineEntity> findBySubmissionIdWithSerial(@Param("submissionId") Long submissionId);
}
