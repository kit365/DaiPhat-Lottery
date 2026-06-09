package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LotteryTicketStatus {
    IN_STOCK("Trong kho"),
    RESERVED("Đang giữ chỗ"),
    SOLD_ONLINE("Đã bán online"),
    SOLD_OFFLINE("Đã bán offline"),
    EXPIRED("Hết hạn"),
    RETURNED_TO_ISSUER("Đã trả nhà đài"),
    DAMAGED("Hỏng");

    private final String displayName;
}
