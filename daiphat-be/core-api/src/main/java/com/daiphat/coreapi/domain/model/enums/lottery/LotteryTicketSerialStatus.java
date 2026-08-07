package com.daiphat.coreapi.domain.model.enums.lottery;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LotteryTicketSerialStatus implements LabeledEnum {
    IN_STOCK("Trong kho"),
    RESERVED("Đang giữ chỗ"),
    SOLD("Đã bán"),
    PROXY_HOLDING("Đại lý giữ hộ"),
    WITH_STREET_AGENT("Đang giao người bán dạo"),
    EXPIRED("Hết hạn");

    private final String displayName;

    @Override
    public String getLabel() {
        return displayName;
    }
}
