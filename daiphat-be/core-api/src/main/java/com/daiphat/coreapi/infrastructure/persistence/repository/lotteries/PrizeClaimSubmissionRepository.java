package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PrizeClaimSubmissionRepository extends JpaRepository<PrizeClaimSubmissionEntity, Long> {

    Optional<PrizeClaimSubmissionEntity> findBySubmissionCode(String code);

    boolean existsBySubmissionCode(String code);

    List<PrizeClaimSubmissionEntity> findByStatus(PrizeClaimSubmissionStatus status);

    @Query("""
            SELECT DISTINCT s FROM PrizeClaimSubmissionEntity s
            JOIN s.lines l
            WHERE s.status = :status
              AND COALESCE(s.handedOverAt, s.submittedAt) < :cutoff
              AND l.lineStatus = :awaitingOutcomeStatus
              AND s.needsOutcome = false
            """)
    List<PrizeClaimSubmissionEntity> findStaleSubmissionsNeedingOutcome(
            @Param("status") PrizeClaimSubmissionStatus status,
            @Param("cutoff") LocalDateTime cutoff,
            @Param("awaitingOutcomeStatus") PrizeClaimSubmissionLineStatus awaitingOutcomeStatus);

    List<PrizeClaimSubmissionEntity> findByLotterySupplierIdOrderByCreatedAtDesc(Long supplierId);

    @Query("""
            SELECT s FROM PrizeClaimSubmissionEntity s
            LEFT JOIN FETCH s.lotterySupplier sup
            WHERE (:supplierId IS NULL OR sup.id = :supplierId)
              AND (:statuses IS NULL OR s.status IN :statuses)
              AND (
                :search IS NULL OR :search = '' OR
                LOWER(s.submissionCode) LIKE LOWER(CONCAT('%', :search, '%')) OR
                (sup IS NOT NULL AND (
                    LOWER(sup.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                    LOWER(sup.code) LIKE LOWER(CONCAT('%', :search, '%'))
                ))
              )
            ORDER BY s.createdAt DESC
            """)
    List<PrizeClaimSubmissionEntity> findAllFiltered(
            @Param("supplierId") Long supplierId,
            @Param("statuses") List<PrizeClaimSubmissionStatus> statuses,
            @Param("search") String search);

    @Query("""
            SELECT s FROM PrizeClaimSubmissionEntity s
            LEFT JOIN FETCH s.lotterySupplier
            WHERE s.id = :id
            """)
    Optional<PrizeClaimSubmissionEntity> findByIdWithSupplier(@Param("id") Long id);
}
