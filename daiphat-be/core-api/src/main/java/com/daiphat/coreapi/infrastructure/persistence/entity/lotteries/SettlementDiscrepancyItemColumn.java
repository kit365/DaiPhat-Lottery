package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;

/**
 * Jackson-friendly JSONB shape for discrepancy_items.
 * Keep this separate from the domain model (boolean getters there break Hibernate JSON).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class SettlementDiscrepancyItemColumn {

    private String type;
    private String direction;
    private BigDecimal difference;
    private String unit;

    public SettlementDiscrepancyItemColumn() {
    }

    public SettlementDiscrepancyItemColumn(String type, String direction, BigDecimal difference, String unit) {
        this.type = type;
        this.direction = direction;
        this.difference = difference;
        this.unit = unit;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public BigDecimal getDifference() {
        return difference;
    }

    public void setDifference(BigDecimal difference) {
        this.difference = difference;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }
}
