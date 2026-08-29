package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PrizeClaimSubmissionRepository extends JpaRepository<PrizeClaimSubmissionEntity, Long> {

    Optional<PrizeClaimSubmissionEntity> findBySubmissionCode(String code);

    boolean existsBySubmissionCode(String code);

    List<PrizeClaimSubmissionEntity> findByStatus(PrizeClaimSubmissionStatus status);

    @Query("""
            SELECT s FROM PrizeClaimSubmissionEntity s
             WHERE s.status = :status
               AND s.paymentDeadline < :deadline
               AND s.overdue = false
            """)
    List<PrizeClaimSubmissionEntity> findPaymentPendingOverdue(
            @Param("status") PrizeClaimSubmissionStatus status,
            @Param("deadline") LocalDate deadline);

    List<PrizeClaimSubmissionEntity> findByLotterySupplierIdOrderByCreatedAtDesc(Long supplierId);

    @Query("""
            SELECT s FROM PrizeClaimSubmissionEntity s
            JOIN FETCH s.lotterySupplier
            WHERE (:supplierId IS NULL OR s.lotterySupplier.id = :supplierId)
              AND (:status IS NULL OR s.status = :status)
            ORDER BY s.createdAt DESC
            """)
    List<PrizeClaimSubmissionEntity> findAllFiltered(
            @Param("supplierId") Long supplierId,
            @Param("status") PrizeClaimSubmissionStatus status);

    @Query("""
            SELECT s FROM PrizeClaimSubmissionEntity s
            JOIN FETCH s.lotterySupplier
            WHERE s.id = :id
            """)
    Optional<PrizeClaimSubmissionEntity> findByIdWithSupplier(@Param("id") Long id);
}
