package com.daiphat.coreapi.domain.model.enums.transaction;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TransactionType implements LabeledEnum {
    OFFLINE("Tiền mặt"),
    ONLINE("Chuyển khoản / thanh toán online");

    private final String label;
}
