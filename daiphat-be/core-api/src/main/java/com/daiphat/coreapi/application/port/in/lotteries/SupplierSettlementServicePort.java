package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementOverviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;

import java.time.LocalDate;

public interface SupplierSettlementServicePort {

    /**
     * Find existing settlement for supplier + draw date (periodFrom), or create one.
     */
    SupplierSettlementModel findOrCreateForImport(LotterySupplierModel supplier, LocalDate drawDate);

    /**
     * Recalculate totalImportValue from imported line quantities linked to this settlement.
     * Also refreshes remainingAmount (inspection-gated IN_STOCK/GOOD payable).
     */
    void recalculateTotalImportValue(Long settlementId);

    /**
     * Recalculate totalReturnValue from tickets prepared for return
     * (linked via returnBatchLineId), not only after full SUCCESS handover.
     * Also refreshes remainingAmount (inspection-gated IN_STOCK/GOOD payable).
     */
    void recalculateTotalReturnValue(Long settlementId);

    /**
     * Recalculate import + return + remaining in one pass (avoids duplicate loads).
     */
    void recalculateAmounts(Long settlementId);

    PageResponse<SupplierSettlementResponse> getAll(
            int page,
            int size,
            Long lotterySupplierId,
            SupplierSettlementStatus status,
            LocalDate periodFrom,
            LocalDate periodTo,
            String search,
            String sortBy,
            String direction
    );

    SupplierSettlementResponse getById(Long id);

    /**
     * Full read-only overview: settlement header, KPIs, linked batches, inventory by station.
     */
    SupplierSettlementOverviewResponse getOverview(Long id);
}
