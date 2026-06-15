package com.daiphat.coreapi.domain.model.enums.transaction;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TransactionStatus implements LabeledEnum {
    PENDING("Đang chờ"),
    COMPLETED("Hoàn tất"),
    FAILED("Thất bại"),
    CANCELLED("Đã hủy"),
    REFUNDED("Đã hoàn tiền");

    private final String label;
}
