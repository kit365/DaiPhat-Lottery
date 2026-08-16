package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReturnBatchLineStatus {
    PENDING("Chờ kiểm tra"),
    INSPECTING("Đang kiểm tra"),
    INSPECTED("Đã kiểm tra");

    private final String label;

    /** Line can still receive / remove serials during batch inspection. */
    public boolean isOpenForInspection() {
        return this == PENDING || this == INSPECTING;
    }
}
