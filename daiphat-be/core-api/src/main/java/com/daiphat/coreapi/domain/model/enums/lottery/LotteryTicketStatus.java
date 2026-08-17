package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LotteryTicketStatus {
    IMPORTING("Đang nhập lô"),
    IN_STOCK("Trong kho"),
    SOLD_OUT("Hết hàng"),
    EXPIRED("Hết hạn");

    private final String displayName;
}
