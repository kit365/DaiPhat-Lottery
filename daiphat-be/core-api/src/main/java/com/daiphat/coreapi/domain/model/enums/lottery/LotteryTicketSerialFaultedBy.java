package com.daiphat.coreapi.domain.model.enums.lottery;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LotteryTicketSerialFaultedBy implements LabeledEnum {
    INTERNAL_FAULT("Nhân viên làm hỏng"),
    ISSUER_FAULT("Lỗi in ấn từ nhà cung cấp");

    private final String displayName;

    @Override
    public String getLabel() {
        return displayName;
    }
}
