package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ImportBatchStatus {
    DRAFT("Phiếu nháp"),
    RECEIVING("Đang nhập lô"),
    CANCELLED("Đã hủy"),
    IMPORTED("Đã nhập kho"),
    IN_LEDGER("Đã vào sổ công nợ");

    private final String label;
}
