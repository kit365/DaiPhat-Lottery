package com.daiphat.coreapi.domain.model.lotteries;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * Frozen per-station commission for one supplier-settlement.
 * {@code systemCommissionRate} is captured when the settlement is created;
 * {@code actualCommissionRate} is filled on matching confirm.
 * Jackson-friendly so the same shape can be stored as JSONB.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class StationCommissionSnapshot {

    private Long lotteryStationId;
    private Integer importedQuantity;
    private BigDecimal systemCommissionRate;
    private BigDecimal actualCommissionRate;

    /**
     * Value equality (BigDecimal by numeric value) is required: Hibernate dirty-checks the JSONB list
     * with equals; identity equality would flush an UPDATE on every load of the settlement.
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof StationCommissionSnapshot that)) {
            return false;
        }
        return Objects.equals(lotteryStationId, that.lotteryStationId)
                && Objects.equals(importedQuantity, that.importedQuantity)
                && sameNumber(systemCommissionRate, that.systemCommissionRate)
                && sameNumber(actualCommissionRate, that.actualCommissionRate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(
                lotteryStationId,
                importedQuantity,
                normalized(systemCommissionRate),
                normalized(actualCommissionRate));
    }

    private static boolean sameNumber(BigDecimal a, BigDecimal b) {
        return a == null ? b == null : b != null && a.compareTo(b) == 0;
    }

    private static BigDecimal normalized(BigDecimal value) {
        return value != null ? value.stripTrailingZeros() : null;
    }
}
