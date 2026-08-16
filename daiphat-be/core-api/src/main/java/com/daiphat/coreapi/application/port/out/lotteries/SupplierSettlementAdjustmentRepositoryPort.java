package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementAdjustmentGroupType;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementAdjustmentReasonCode;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementAdjustmentModel;

import java.math.BigDecimal;
import java.util.List;

public interface SupplierSettlementAdjustmentRepositoryPort {

    SupplierSettlementAdjustmentModel save(SupplierSettlementAdjustmentModel model);

    List<SupplierSettlementAdjustmentModel> findBySettlementId(Long settlementId);

    void deleteBySettlementIdAndGroupType(Long settlementId, SupplierSettlementAdjustmentGroupType groupType);

    void deleteBySettlementIdAndGroupTypeAndReasonCode(
            Long settlementId,
            SupplierSettlementAdjustmentGroupType groupType,
            SupplierSettlementAdjustmentReasonCode reasonCode
    );

    BigDecimal sumValueOnlyAdjustmentsBySettlementId(Long settlementId);
}
