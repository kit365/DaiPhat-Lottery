package com.daiphat.coreapi.domain.model.enums.streetagent;

/**
 * Vendor confidence tier names only. Cap percentages and thresholds come from
 * {@code VENDOR_SETTING} system configs, not from this enum.
 */
public enum VendorConfidenceTier {
    NEW,
    DEVELOPING,
    ESTABLISHED,
    TRUSTED
}
