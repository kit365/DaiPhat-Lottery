package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

public interface SupplierSettlementRepositoryPort {

    SupplierSettlementModel save(SupplierSettlementModel model);

    Optional<SupplierSettlementModel> findById(Long id);

    Optional<SupplierSettlementModel> findBySupplierIdAndPeriodFrom(Long supplierId, LocalDate periodFrom);

    Page<SupplierSettlementModel> findAll(
            Pageable pageable,
            Long lotterySupplierId,
            SupplierSettlementStatus status,
            LocalDate periodFrom,
            LocalDate periodTo,
            String search
    );

    BigDecimal sumImportedCostValueBySettlementId(Long settlementId);

    /**
     * Sum import cost of tickets prepared for return (linked via {@code returnBatchLineId})
     * for return batches linked to this settlement.
     */
    BigDecimal sumPreparedReturnValueBySettlementId(Long settlementId);

    /**
     * {@code true} when at least one return batch for this settlement has finished inspection
     * ({@code PENDING_HANDOVER} or {@code HANDED_OVER}).
     */
    boolean existsCompletedInspectionReturnBatch(Long settlementId);

    /**
     * Sum import cost of settlement-scoped serials that are {@code IN_STOCK} + {@code GOOD}.
     */
    BigDecimal sumInStockGoodImportCostBySettlementId(Long settlementId);

    BigDecimal sumExpiredReturnValueBySettlementId(Long settlementId);
}
