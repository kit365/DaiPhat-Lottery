package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyDirection;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyType;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record SettlementDiscrepancyItemResponse(
        SupplierSettlementDiscrepancyType type,
        String typeLabel,
        SupplierSettlementDiscrepancyDirection direction,
        String directionLabel,
        BigDecimal difference,
        String unit
) {
}
