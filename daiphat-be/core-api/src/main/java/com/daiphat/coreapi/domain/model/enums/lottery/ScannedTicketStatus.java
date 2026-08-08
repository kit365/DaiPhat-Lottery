package com.daiphat.coreapi.domain.model.enums.lottery;

/**
 * Mirrors the ticket-vision Python service's TicketStatus enum
 * (services/ticket-vision/domain/enums/ticket_status.py) for the mobile
 * bounding-box overlay color: green/yellow/red.
 *
 * <p>Python's status is format/confidence-only (Layer 1). Java may
 * downgrade COMPLETE/NEEDS_REVIEW to INCOMPLETE after Layer 2 business
 * checks (draw date mismatch, duplicate serial, invalid number length for
 * the station) — see TicketScanImportService — but never upgrades a
 * status Python reported as lower.
 */
public enum ScannedTicketStatus {
    COMPLETE,
    NEEDS_REVIEW,
    INCOMPLETE
}
