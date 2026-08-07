package com.daiphat.coreapi.domain.service.streetagent;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorDepositCalculator {

    public static BigDecimal calculate(int quantity, BigDecimal vendorUnitPrice, BigDecimal depositRate) {
        if (quantity < 0 || vendorUnitPrice == null || vendorUnitPrice.signum() < 0
                || depositRate == null || depositRate.signum() < 0
                || depositRate.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("Invalid vendor deposit inputs");
        }
        return vendorUnitPrice
                .multiply(BigDecimal.valueOf(quantity))
                .multiply(depositRate)
                .setScale(0, RoundingMode.HALF_UP);
    }
}
