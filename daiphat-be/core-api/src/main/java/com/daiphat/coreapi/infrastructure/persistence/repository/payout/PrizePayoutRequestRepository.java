package com.daiphat.coreapi.infrastructure.persistence.repository.payout;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PrizePayoutRequestRepository extends JpaRepository<PrizePayoutRequestEntity, Long>,
        JpaSpecificationExecutor<PrizePayoutRequestEntity> {

    boolean existsByRequestCode(String requestCode);

    boolean existsBySerial_IdAndStatusIn(Long serialId, Collection<PrizePayoutRequestStatus> statuses);

    long countBySerial_IdAndChannelAndStatusIn(
            Long serialId,
            com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel channel,
            Collection<PrizePayoutRequestStatus> statuses);

    boolean existsBySerial_IdAndChannelAndStatus(
            Long serialId,
            com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel channel,
            PrizePayoutRequestStatus status);

    Optional<PrizePayoutRequestEntity> findBySerial_IdAndStatus(Long serialId, PrizePayoutRequestStatus status);

    List<PrizePayoutRequestEntity> findBySerial_IdInAndStatus(
            Collection<Long> serialIds,
            PrizePayoutRequestStatus status);

    List<PrizePayoutRequestEntity> findBySerial_IdInOrderByCreatedAtDesc(Collection<Long> serialIds);

    List<PrizePayoutRequestEntity> findByStatus(PrizePayoutRequestStatus status);

    long countByCustomer_IdAndStatus(UUID customerId, PrizePayoutRequestStatus status);

    @Query("""
            SELECT COALESCE(SUM(r.grossAmount), 0)
              FROM PrizePayoutRequestEntity r
             WHERE r.status = :status
            """)
    BigDecimal sumGrossAmountByStatus(@Param("status") PrizePayoutRequestStatus status);

    /**
     * Vé đã trả thưởng (COMPLETED + PAID_OUT), đúng nhà đài, chưa nằm trong phiếu nộp active.
     */
    @Query("""
            SELECT ppr FROM PrizePayoutRequestEntity ppr
            JOIN FETCH ppr.serial s
            LEFT JOIN FETCH s.ticket t
            WHERE ppr.status = :completedStatus
              AND s.payoutState = :paidOutState
              AND s.stationId = :supplierId
              AND (:periodFrom IS NULL OR s.drawDate >= :periodFrom)
              AND (:periodTo IS NULL OR s.drawDate <= :periodTo)
              AND NOT EXISTS (
                  SELECT 1 FROM PrizeClaimSubmissionLineEntity line
                   WHERE line.serial.id = s.id
                     AND line.lineStatus NOT IN :inactiveLineStatuses
              )
            ORDER BY s.drawDate DESC, ppr.completedAt DESC
            """)
    List<PrizePayoutRequestEntity> findEligibleForPrizeClaimSubmission(
            @Param("supplierId") Long supplierId,
            @Param("periodFrom") LocalDate periodFrom,
            @Param("periodTo") LocalDate periodTo,
            @Param("completedStatus") PrizePayoutRequestStatus completedStatus,
            @Param("paidOutState") SerialPayoutState paidOutState,
            @Param("inactiveLineStatuses") Collection<PrizeClaimSubmissionLineStatus> inactiveLineStatuses);
}
