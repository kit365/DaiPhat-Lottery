package com.daiphat.coreapi.domain.model.enums.payout;

/**
 * Customer-facing vs issuer (station) redemption window relative to {@code today} (VN).
 */
public enum PrizeRedemptionZone {
    /** today &lt;= customer deadline — normal claim. */
    WITHIN_CUSTOMER,
    /** customer &lt; today &lt;= issuer — online blocked; staff needs late ack. */
    PAST_CUSTOMER_URGENT,
    /** today &gt; issuer — hard lock. */
    PAST_ISSUER_LOCKED
}
