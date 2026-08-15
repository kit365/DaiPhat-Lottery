package com.daiphat.coreapi.domain.model.enums.lottery;

public enum ImportBatchFileRowStatus {
    /** Ready to become an import batch line. */
    OK,
    /** Usable, but the operator should look at it first. */
    WARNING,
    /** Cannot be imported until the file or the mapping is fixed. */
    ERROR,
    /** Outside the importable draw-date window; expected, not a defect. */
    SKIPPED
}
