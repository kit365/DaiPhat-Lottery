package com.daiphat.coreapi.domain.model.enums.streetagent;

public enum AllocationBatchStatus {
    DRAFT,
    CONFIRMED,
    RETURN_OPEN,
    SETTLED,
    LATE_SETTLED,
    CANCELLED,
    EXPIRED;

    public boolean isOpen() {
        return this == DRAFT || this == CONFIRMED || this == RETURN_OPEN;
    }

    /**
     * A ticket allowance limits a single active handover, not the cumulative
     * number of tickets settled during a calendar day. A settled batch has
     * closed its physical and financial responsibility, so it must release
     * the allowance for the vendor's next handover.
     */
    public boolean isCapConsuming() {
        return this == DRAFT
                || this == CONFIRMED
                || this == RETURN_OPEN;
    }

    public boolean isTerminalForConfidence() {
        return this == SETTLED || this == LATE_SETTLED;
    }
}
