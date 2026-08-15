package com.daiphat.coreapi.domain.model.enums.lottery;

public enum ImportBatchFileIssueSeverity {
    /** The row is usable as-is; the note is informational. */
    WARNING,
    /** The row cannot become an import batch line. */
    ERROR,
    /** Expected exclusion, not a defect in the file. */
    SKIPPED
}
