package com.daiphat.coreapi.domain.model.enums.order.refund;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReimburseStatus implements LabeledEnum {
    NONE("Không áp dụng"),
    PENDING("Chờ hoàn ứng"),
    APPROVED("Đã hoàn ứng"),
    REJECTED("Từ chối hoàn ứng");

    private final String label;
}
