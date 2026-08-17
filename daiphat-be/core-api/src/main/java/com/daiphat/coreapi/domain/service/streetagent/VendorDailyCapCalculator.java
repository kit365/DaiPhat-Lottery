package com.daiphat.coreapi.domain.service.streetagent;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorDailyCapCalculator {

    /**
     * The contract contains the single agreed ceiling per active handover. The
     * confidence tier controls how much of that ceiling is available for the
     * vendor's currently open handover.
     */
    public static int effective(int contractDailyCap, BigDecimal capPercentage) {
        if (contractDailyCap < 0 || capPercentage == null) {
            throw new IllegalArgumentException("Invalid vendor daily cap inputs");
        }
        if (capPercentage.compareTo(BigDecimal.ZERO) < 0 || capPercentage.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("Cap percentage must be between 0 and 1");
        }
        return capPercentage
                .multiply(BigDecimal.valueOf(contractDailyCap))
                .setScale(0, RoundingMode.FLOOR)
                .intValueExact();
    }

    public static int remaining(int contractDailyCap, BigDecimal capPercentage, int alreadyConsumed) {
        if (alreadyConsumed < 0) {
            throw new IllegalArgumentException("Consumed quantity cannot be negative");
        }
        return Math.max(0, effective(contractDailyCap, capPercentage) - alreadyConsumed);
    }
}
