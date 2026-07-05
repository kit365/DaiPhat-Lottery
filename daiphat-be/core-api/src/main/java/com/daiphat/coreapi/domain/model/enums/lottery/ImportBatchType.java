package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ImportBatchType {
    NEW("Nhập mới"),
    SUPPLEMENTARY("Nhập bổ sung"),
    ADJUSTMENT("Nhập vé điều chỉnh"),
    LATE_IMPORT("Nhập trễ");

    private final String label;
}
