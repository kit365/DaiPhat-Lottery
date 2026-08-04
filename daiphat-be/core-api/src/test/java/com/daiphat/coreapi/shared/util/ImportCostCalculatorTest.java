package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ImportCostCalculator")
class ImportCostCalculatorTest {

    @Test
    @DisplayName("computes price x (1 - commission) with HALF_UP scale 3")
    void fromPriceAndCommission_standardCase() {
        BigDecimal cost = ImportCostCalculator.fromPriceAndCommission(
                new BigDecimal("10000"),
                new BigDecimal("0.05")
        );
        assertThat(cost).isEqualByComparingTo("9500.000");
        assertThat(cost.scale()).isEqualTo(3);
    }

    @Test
    @DisplayName("rounds half up to 3 decimals")
    void fromPriceAndCommission_halfUp() {
        // 10000 * (1 - 0.12345) = 8765.5 → 8765.500
        BigDecimal cost = ImportCostCalculator.fromPriceAndCommission(
                new BigDecimal("10000"),
                new BigDecimal("0.12345")
        );
        assertThat(cost).isEqualByComparingTo("8765.500");
        assertThat(cost.scale()).isEqualTo(3);

        // 1000 * (1 - 0.0015) = 998.5 → 998.500
        assertThat(ImportCostCalculator.fromPriceAndCommission(
                new BigDecimal("1000"),
                new BigDecimal("0.0015")
        )).isEqualByComparingTo("998.500");
    }

    @Test
    @DisplayName("reads station price and commission")
    void fromStation_usesStationFields() {
        LotteryStationModel station = LotteryStationModel.builder()
                .price(new BigDecimal("12000"))
                .commissionRate(new BigDecimal("0.1"))
                .build();
        assertThat(ImportCostCalculator.fromStation(station)).isEqualByComparingTo("10800.000");
    }

    @Test
    @DisplayName("rejects invalid price or commission")
    void fromPriceAndCommission_invalidInputs() {
        assertThatThrownBy(() -> ImportCostCalculator.fromPriceAndCommission(BigDecimal.ZERO, BigDecimal.ZERO))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_IMPORT_COST_INVALID);

        assertThatThrownBy(() -> ImportCostCalculator.fromPriceAndCommission(
                new BigDecimal("10000"),
                new BigDecimal("1.1")
        ))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_IMPORT_COST_INVALID);
    }
}
