package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SettlementDiscrepancyItemColumn;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Supplier settlement JSONB element equality")
class SettlementJsonColumnEqualityTest {

    @Test
    @DisplayName("StationCommissionSnapshot: equal by value, ignoring BigDecimal scale")
    void stationCommissionSnapshot_valueEquality() {
        StationCommissionSnapshot a = new StationCommissionSnapshot(3L, 10, new BigDecimal("0.15"), null);
        StationCommissionSnapshot b = new StationCommissionSnapshot(3L, 10, new BigDecimal("0.1500"), null);
        StationCommissionSnapshot other = new StationCommissionSnapshot(3L, 10, new BigDecimal("0.16"), null);

        assertThat(a).isEqualTo(b).hasSameHashCodeAs(b).isNotEqualTo(other);
        assertThat(List.of(a)).isEqualTo(List.of(b));
    }

    @Test
    @DisplayName("SettlementDiscrepancyItemColumn: equal by value, ignoring BigDecimal scale")
    void discrepancyItemColumn_valueEquality() {
        SettlementDiscrepancyItemColumn a =
                new SettlementDiscrepancyItemColumn("IMPORT_QUANTITY", "OVER", new BigDecimal("2"), "TICKET");
        SettlementDiscrepancyItemColumn b =
                new SettlementDiscrepancyItemColumn("IMPORT_QUANTITY", "OVER", new BigDecimal("2.00"), "TICKET");
        SettlementDiscrepancyItemColumn other =
                new SettlementDiscrepancyItemColumn("IMPORT_QUANTITY", "UNDER", new BigDecimal("2"), "TICKET");

        assertThat(a).isEqualTo(b).hasSameHashCodeAs(b).isNotEqualTo(other);
    }
}
