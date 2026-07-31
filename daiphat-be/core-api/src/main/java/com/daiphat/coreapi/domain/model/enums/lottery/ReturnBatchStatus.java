package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReturnBatchStatus {
    PENDING("Đang chuẩn bị trả vé"),
    RETURNED("Đã giao trả nhà cung cấp"),
    CONFIRMED("Nhà cung cấp đã xác nhận");

    private final String label;
}
