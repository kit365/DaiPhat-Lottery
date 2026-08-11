package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SupplierSettlementDiscrepancyDirection {
    POSITIVE("Dương"),
    NEGATIVE("Âm");

    private final String label;

    public static SupplierSettlementDiscrepancyDirection fromSignedDifference(int difference) {
        return difference > 0 ? POSITIVE : NEGATIVE;
    }

    public static SupplierSettlementDiscrepancyDirection fromSignedDifference(java.math.BigDecimal difference) {
        if (difference == null || difference.signum() == 0) {
            return null;
        }
        return difference.signum() > 0 ? POSITIVE : NEGATIVE;
    }
}
