package com.daiphat.coreapi.domain.service.streetagent;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class VendorDailyCapCalculatorTest {

    @Test
    void calculates_remaining_daily_cap() {
        assertThat(VendorDailyCapCalculator.remaining(100, new BigDecimal("0.75"), 20))
                .isEqualTo(55);
    }

    @Test
    void calculates_effective_cap_from_the_single_contract_cap_and_confidence_rate() {
        assertThat(VendorDailyCapCalculator.effective(200, new BigDecimal("0.25")))
                .isEqualTo(50);
    }

    @Test
    void never_returns_negative_remaining_cap() {
        assertThat(VendorDailyCapCalculator.remaining(100, new BigDecimal("0.25"), 30))
                .isZero();
    }
}
