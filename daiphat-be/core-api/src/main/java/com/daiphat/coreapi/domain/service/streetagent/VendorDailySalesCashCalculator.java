package com.daiphat.coreapi.domain.service.streetagent;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Daily sales report cash is actual sold revenue only: {@code sold × faceValue}.
 * Forced-purchase / deposit / additional-due amounts belong on AgentSettlement, not the report.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorDailySalesCashCalculator {

    public static BigDecimal cashCollected(int soldQuantity, BigDecimal faceValueSnapshot) {
        if (soldQuantity <= 0 || faceValueSnapshot == null) {
            return BigDecimal.ZERO;
        }
        return faceValueSnapshot
                .multiply(BigDecimal.valueOf(soldQuantity))
                .setScale(0, RoundingMode.HALF_UP);
    }
}
