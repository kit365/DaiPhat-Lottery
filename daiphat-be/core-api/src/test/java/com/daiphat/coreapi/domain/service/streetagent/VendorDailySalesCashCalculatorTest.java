package com.daiphat.coreapi.domain.service.streetagent;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class VendorDailySalesCashCalculatorTest {

    @Test
    void cash_is_sold_times_face_value() {
        assertThat(VendorDailySalesCashCalculator.cashCollected(3, new BigDecimal("10000")))
                .isEqualByComparingTo("30000");
    }

    @Test
    void cash_is_zero_when_no_sold_or_face_value() {
        assertThat(VendorDailySalesCashCalculator.cashCollected(0, new BigDecimal("10000")))
                .isEqualByComparingTo("0");
        assertThat(VendorDailySalesCashCalculator.cashCollected(5, null))
                .isEqualByComparingTo("0");
    }

    @Test
    void force_purchase_scenario_with_zero_sold_collects_zero_cash() {
        // LATE FORCE_PURCHASE_ALL may remit cash at settlement, but report cash is sold revenue only.
        assertThat(VendorDailySalesCashCalculator.cashCollected(0, new BigDecimal("9000")))
                .isEqualByComparingTo("0");
    }
}
