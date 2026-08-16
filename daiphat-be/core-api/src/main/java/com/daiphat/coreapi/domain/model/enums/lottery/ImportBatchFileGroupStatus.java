package com.daiphat.coreapi.domain.model.enums.lottery;

public enum ImportBatchFileGroupStatus {
    /** A batch can be created for this draw date. */
    IMPORTABLE,
    /** Draw date is neither today nor tomorrow, so no batch is possible yet. */
    OUT_OF_WINDOW,
    /** Inside the window, but a supplier or data rule blocks the whole group. */
    BLOCKED
}
