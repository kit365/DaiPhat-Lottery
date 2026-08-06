package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VendorDailyCapCalculatorTest {

    @Test
    void calculates_remaining_daily_cap() {
        assertThat(VendorDailyCapCalculator.remaining(100, VendorConfidenceTier.ESTABLISHED, 20))
                .isEqualTo(55);
    }

    @Test
    void never_returns_negative_remaining_cap() {
        assertThat(VendorDailyCapCalculator.remaining(100, VendorConfidenceTier.NEW, 30))
                .isZero();
    }
}
