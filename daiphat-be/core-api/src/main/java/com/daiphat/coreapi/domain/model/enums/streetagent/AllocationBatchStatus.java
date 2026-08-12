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

    /** Statuses that consume daily ticket cap until CANCELLED/EXPIRED. */
    public boolean isCapConsuming() {
        return this == DRAFT
                || this == CONFIRMED
                || this == RETURN_OPEN
                || this == SETTLED
                || this == LATE_SETTLED;
    }

    public boolean isTerminalForConfidence() {
        return this == SETTLED || this == LATE_SETTLED;
    }
}
