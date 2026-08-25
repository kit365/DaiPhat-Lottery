package com.daiphat.coreapi.domain.model.enums.lottery;

/**
 * Mirrors the ticket-vision Python service's TicketStatus enum
 * (services/ticket-vision/domain/enums/ticket_status.py) for the mobile
 * bounding-box overlay color: green/yellow/red/amber-partial.
 *
 * <p>Python's status is format/confidence-only (Layer 1). Java may
 * downgrade COMPLETE/NEEDS_REVIEW to PARTIAL/INCOMPLETE after Layer 2
 * business checks — see TicketScanImportService — but never upgrades a
 * status Python reported as lower.
 */
public enum ScannedTicketStatus {
    COMPLETE,
    NEEDS_REVIEW,
    /** Some fields recognized; others missing/unreadable — manual review required. */
    PARTIAL,
    INCOMPLETE,
    /** Full-image recognition failure — no usable ticket fields from OCR. */
    FAILED
}
