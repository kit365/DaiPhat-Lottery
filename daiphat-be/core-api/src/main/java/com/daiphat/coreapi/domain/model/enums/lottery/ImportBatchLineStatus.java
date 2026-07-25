package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ImportBatchLineStatus {
    OPEN("Chưa nhập"),
    IMPORTING("Đang nhập"),
    PAUSED("Tạm dừng nhập"),
    IMPORTED("Đã nhập đủ"),
    CANCELLED("Đã hủy");

    private final String label;
}
