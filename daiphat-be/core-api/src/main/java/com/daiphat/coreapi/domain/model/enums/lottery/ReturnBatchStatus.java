package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReturnBatchStatus {
    PENDING_INSPECTION("Chờ kiểm tra vé"),
    INSPECTING("Đang kiểm tra vé"),
    PENDING_HANDOVER("Chờ bàn giao nhà cung cấp"),
    HANDED_OVER("Đã bàn giao nhà cung cấp"),
    RECEIVED("Đã xác nhận nhận vé"),
    CANCELLED("Đã hủy");

    private final String label;

    /** Batch is waiting for or currently undergoing ticket inspection. */
    public boolean isOpenForInspection() {
        return this == PENDING_INSPECTION || this == INSPECTING;
    }

    /** Auto-generation may still enrich stations / refresh inventory summary. */
    public boolean allowsAutoEnrichment() {
        return isOpenForInspection();
    }

    public boolean isTerminal() {
        return this == HANDED_OVER || this == RECEIVED || this == CANCELLED;
    }

    public boolean isCancelled() {
        return this == CANCELLED;
    }
}
