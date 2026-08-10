package com.daiphat.coreapi.domain.service.streetagent;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorDailyCapCalculator {

    public static int effective(int contractMaxDailyCap, int approvedDailyCap, BigDecimal capPercentage) {
        if (contractMaxDailyCap < 0 || approvedDailyCap < 0 || capPercentage == null) {
            throw new IllegalArgumentException("Invalid vendor daily cap inputs");
        }
        if (capPercentage.compareTo(BigDecimal.ZERO) < 0 || capPercentage.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("Cap percentage must be between 0 and 1");
        }
        return capPercentage
                .multiply(BigDecimal.valueOf(Math.min(contractMaxDailyCap, approvedDailyCap)))
                .setScale(0, RoundingMode.FLOOR)
                .intValueExact();
    }

    public static int remaining(int contractMaxDailyCap, int approvedDailyCap, BigDecimal capPercentage, int alreadyConsumed) {
        if (alreadyConsumed < 0) {
            throw new IllegalArgumentException("Consumed quantity cannot be negative");
        }
        return Math.max(0, effective(contractMaxDailyCap, approvedDailyCap, capPercentage) - alreadyConsumed);
    }

    /** @deprecated use the contract and operational cap overload. */
    @Deprecated public static int effective(int legacyDailyCap, BigDecimal percentage) {
        return effective(legacyDailyCap, legacyDailyCap, percentage);
    }

    /** @deprecated use the contract and operational cap overload. */
    @Deprecated public static int remaining(int legacyDailyCap, BigDecimal percentage, int consumed) {
        return remaining(legacyDailyCap, legacyDailyCap, percentage, consumed);
    }
}
