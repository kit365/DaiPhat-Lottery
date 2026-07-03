package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ImportBatchType {
    NEW("Lô mới đầu ngày"),
    SUPPLEMENTARY("Lô bổ sung"),
    ADJUSTMENT("Lô điều chỉnh"),
    LATE_IMPORT("Nhập muộn");

    private final String label;
}
