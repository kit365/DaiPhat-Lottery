package com.daiphat.coreapi.domain.model.lotteries;

public final class ImportBatchCancelReason {

    public static final String IMPORT_DEADLINE_PASSED =
            "Automatically cancelled because the import deadline has passed.";

    public static final String DRAW_DATE_EXPIRED =
            "Automatically cancelled because the Draw Date has expired while the batch was still in DRAFT status.";

    private ImportBatchCancelReason() {
    }
}
