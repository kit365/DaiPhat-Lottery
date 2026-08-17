package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementAdjustmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface SupplierSettlementAdjustmentRepository
        extends JpaRepository<SupplierSettlementAdjustmentEntity, Long> {

    List<SupplierSettlementAdjustmentEntity> findBySupplierSettlement_IdAndDeletedAtIsNull(Long settlementId);

    @Query("""
            SELECT COALESCE(SUM(a.amount), 0)
            FROM SupplierSettlementAdjustmentEntity a
            WHERE a.supplierSettlement.id = :settlementId
              AND a.deletedAt IS NULL
              AND a.lotteryTicketSerialId IS NULL
            """)
    BigDecimal sumValueOnlyAdjustmentsBySettlementId(@Param("settlementId") Long settlementId);
}
