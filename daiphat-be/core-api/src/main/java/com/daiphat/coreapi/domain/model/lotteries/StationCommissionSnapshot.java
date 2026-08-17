package com.daiphat.coreapi.domain.model.lotteries;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

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
}
