package com.daiphat.coreapi.domain.model.enums.order.refund;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RefundFundSource implements LabeledEnum {
    COMPANY_FUND("Quỹ công ty"),
    PERSONAL_FUND("Quỹ cá nhân nhân viên");

    private final String label;
}
