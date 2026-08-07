package com.daiphat.coreapi.domain.service.streetagent;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VendorDepositCalculatorTest {

    @Test
    void calculates_ten_percent_of_vendor_value() {
        BigDecimal result = VendorDepositCalculator.calculate(
                100,
                new BigDecimal("9000"),
                new BigDecimal("0.10")
        );

        assertThat(result).isEqualByComparingTo("90000");
    }

    @Test
    void rejects_invalid_inputs() {
        assertThatThrownBy(() -> VendorDepositCalculator.calculate(-1, new BigDecimal("9000"), new BigDecimal("0.10")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> VendorDepositCalculator.calculate(1, new BigDecimal("-1"), new BigDecimal("0.10")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> VendorDepositCalculator.calculate(1, new BigDecimal("9000"), new BigDecimal("1.01")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
