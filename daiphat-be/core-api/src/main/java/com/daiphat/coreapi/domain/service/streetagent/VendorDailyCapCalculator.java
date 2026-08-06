package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.RoundingMode;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorDailyCapCalculator {

    public static int effective(int contractDailyCap, VendorConfidenceTier tier) {
        if (contractDailyCap < 0 || tier == null) {
            throw new IllegalArgumentException("Invalid vendor daily cap inputs");
        }
        return tier.capPercentage()
                .multiply(java.math.BigDecimal.valueOf(contractDailyCap))
                .setScale(0, RoundingMode.FLOOR)
                .intValueExact();
    }

    public static int remaining(int contractDailyCap, VendorConfidenceTier tier, int alreadyConfirmed) {
        if (alreadyConfirmed < 0) {
            throw new IllegalArgumentException("Confirmed quantity cannot be negative");
        }
        return Math.max(0, effective(contractDailyCap, tier) - alreadyConfirmed);
    }
}
