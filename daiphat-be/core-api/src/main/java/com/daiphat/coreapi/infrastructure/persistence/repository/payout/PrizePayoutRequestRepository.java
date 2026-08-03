package com.daiphat.coreapi.infrastructure.persistence.repository.payout;

import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
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

    long countByCustomer_IdAndStatus(UUID customerId, PrizePayoutRequestStatus status);

    @Query("""
            SELECT COALESCE(SUM(r.grossAmount), 0)
              FROM PrizePayoutRequestEntity r
             WHERE r.status = :status
            """)
    BigDecimal sumGrossAmountByStatus(@Param("status") PrizePayoutRequestStatus status);
}
