package com.daiphat.coreapi.domain.model.enums.lottery;

/**
 * Per-field system validation outcome for an OCR-extracted ticket value.
 * Distinct from OCR confidence (how sure recognition was about the read).
 */
public enum OcrFieldValidationStatus {
    MATCHED,
    MISMATCHED,
    NOT_FOUND,
    UNCERTAIN,
    /** Field could not be read (e.g. covered by another overlapping ticket). */
    UNREADABLE
}
