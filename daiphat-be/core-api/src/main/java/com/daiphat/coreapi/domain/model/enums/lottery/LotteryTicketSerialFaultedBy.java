package com.daiphat.coreapi.domain.model.enums.lottery;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LotteryTicketSerialFaultedBy implements LabeledEnum {
    INTERNAL_FAULT("Nhân viên làm hỏng vật lý"),
    ISSUER_FAULT("Lỗi in ấn từ nhà cung cấp"),
    DATA_ENTRY_FAULT("Lỗi thao tác nhập liệu");

    private final String displayName;

    @Override
    public String getLabel() {
        return displayName;
    }
}
