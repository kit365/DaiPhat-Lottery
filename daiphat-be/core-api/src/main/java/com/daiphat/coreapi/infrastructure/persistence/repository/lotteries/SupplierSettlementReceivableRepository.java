package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReceivableStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementReceivableEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierSettlementReceivableRepository extends JpaRepository<SupplierSettlementReceivableEntity, Long> {

    Optional<SupplierSettlementReceivableEntity> findByPrizeClaimSubmissionId(Long submissionId);

    /**
     * Pessimistic lock — SELECT FOR UPDATE.
     * Dùng khi settleOutstandingReceivable để tránh race condition.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM SupplierSettlementReceivableEntity r WHERE r.prizeClaimSubmission.id = :submissionId")
    Optional<SupplierSettlementReceivableEntity> findBySubmissionIdWithLock(@Param("submissionId") Long submissionId);

    List<SupplierSettlementReceivableEntity> findByLotterySupplierIdAndStatus(
            Long supplierId,
            SupplierSettlementReceivableStatus status);

    List<SupplierSettlementReceivableEntity> findByStatus(SupplierSettlementReceivableStatus status);
}
