package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
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
     */
    void recalculateTotalImportValue(Long settlementId);

    /**
     * Recalculate totalReturnValue from SUCCESS return lines linked to this settlement.
     */
    void recalculateTotalReturnValue(Long settlementId);

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
}
