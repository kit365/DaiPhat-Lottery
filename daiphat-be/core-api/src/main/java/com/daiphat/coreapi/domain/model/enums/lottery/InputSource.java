package com.daiphat.coreapi.domain.model.enums.lottery;

/** How a ticket serial got into the system. Audit information, not a permission. */
public enum InputSource {
    SCAN,
    MANUAL,
    /** Created from an uploaded supplier .csv / .xlsx file. */
    FILE_IMPORT
}
