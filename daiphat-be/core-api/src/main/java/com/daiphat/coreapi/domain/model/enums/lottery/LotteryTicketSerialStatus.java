package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LotteryTicketSerialStatus {
    IN_STOCK("Trong kho"),
    RESERVED("Đang giữ chỗ"),
    SOLD("Đã bán"),
    PROXY_HOLDING("Đại lý giữ hộ"),
    PENDING_RETURN("Chờ trả nhà đài"),
    RETURNED("Đã trả nhà đài"),
    EXPIRED("Hết hạn"),
    INTERNAL_FAULT("Nhân viên làm hỏng"),
    ISSUER_FAULT("Lỗi in ấn từ nhà cung cấp");

    private final String displayName;
}
