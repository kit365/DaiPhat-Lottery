package com.daiphat.coreapi.domain.model.enums.streetagent;

/**
 * Business reasons why a requested vendor allocation cannot be fulfilled.
 * The serialized value deliberately remains the enum name for API compatibility.
 */
public enum VendorAllocationShortageReason {
    DAILY_CAP_LIMIT,
    INSUFFICIENT_STATION_CAPACITY,
    NO_DRAWING_STATION,
    NO_ELIGIBLE_TICKET,
    RETURN_CUTOFF_REACHED
}
