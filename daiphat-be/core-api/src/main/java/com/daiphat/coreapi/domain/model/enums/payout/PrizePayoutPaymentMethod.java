package com.daiphat.coreapi.domain.model.enums.payout;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PrizePayoutPaymentMethod implements LabeledEnum {
    CASH("Tiền mặt"),
    TRANSFER("Chuyển khoản"),
    /** Cash at counter + remaining bank transfer (same idea as counter-order PARTIAL). */
    COMBINED("Thanh toán kết hợp");

    private final String displayName;

    @Override
    public String getLabel() {
        return displayName;
    }

    public boolean includesTransfer() {
        return this == TRANSFER || this == COMBINED;
    }

    public boolean includesCash() {
        return this == CASH || this == COMBINED;
    }
}
