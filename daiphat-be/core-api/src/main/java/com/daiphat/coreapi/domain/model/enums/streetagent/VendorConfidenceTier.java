package com.daiphat.coreapi.domain.model.enums.streetagent;

import java.math.BigDecimal;

public enum VendorConfidenceTier {
    NEW("0.25"),
    DEVELOPING("0.50"),
    ESTABLISHED("0.75"),
    TRUSTED("1.00");

    private final BigDecimal capPercentage;

    VendorConfidenceTier(String capPercentage) {
        this.capPercentage = new BigDecimal(capPercentage);
    }

    public BigDecimal capPercentage() {
        return capPercentage;
    }
}
