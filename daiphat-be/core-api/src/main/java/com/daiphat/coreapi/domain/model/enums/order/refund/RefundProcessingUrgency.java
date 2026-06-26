package com.daiphat.coreapi.domain.model.enums.order.refund;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RefundProcessingUrgency {
    ON_TIME("Đúng hạn"),
    NEAR_DEADLINE("Sắp hết hạn"),
    OVERDUE("Quá hạn"),
    NOT_APPLICABLE("Không áp dụng");

    private final String label;
}
