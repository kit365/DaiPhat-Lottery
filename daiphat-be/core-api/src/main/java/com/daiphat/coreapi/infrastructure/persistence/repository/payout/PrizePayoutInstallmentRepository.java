package com.daiphat.coreapi.infrastructure.persistence.repository.payout;

import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutInstallmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface PrizePayoutInstallmentRepository extends JpaRepository<PrizePayoutInstallmentEntity, Long> {

    List<PrizePayoutInstallmentEntity> findByPrizePayoutRequestIdOrderByPaidAtAsc(Long requestId);

    @Query("""
            SELECT COALESCE(SUM(i.installmentAmount), 0)
              FROM PrizePayoutInstallmentEntity i
             WHERE i.prizePayoutRequest.id = :requestId
            """)
    BigDecimal sumByRequestId(@Param("requestId") Long requestId);

    long countByPrizePayoutRequestId(Long requestId);
}
