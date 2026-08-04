package com.daiphat.coreapi.domain.model.enums.payout;

public enum PrizePayoutRequestStatus {
    PENDING,
    /** High-value IN_PERSON claim approved by a second staff member (four-eyes). */
    APPROVED,
    COMPLETED,
    REJECTED,
    /** Online claim locked after too many staff rejects — customer must go to agent. */
    MANUAL_RESOLUTION,
    CANCELLED
}
