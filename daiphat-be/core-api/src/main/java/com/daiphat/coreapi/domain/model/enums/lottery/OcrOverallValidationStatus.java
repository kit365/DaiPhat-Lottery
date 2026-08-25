package com.daiphat.coreapi.domain.model.enums.lottery;

/**
 * Overall system-validation outcome for one OCR-detected ticket.
 * Orthogonal to {@link ScannedTicketStatus} (OCR completeness / overlay color).
 */
public enum OcrOverallValidationStatus {
    VALID,
    NEEDS_REVIEW,
    INVALID
}
