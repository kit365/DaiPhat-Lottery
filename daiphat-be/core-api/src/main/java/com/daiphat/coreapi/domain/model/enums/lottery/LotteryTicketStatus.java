package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LotteryTicketStatus {
    IN_STOCK("Trong kho"),
    SOLD_OUT("Hết hàng"),
    EXPIRED("Hết hạn"),

    // Legacy statuses kept temporarily so the project can migrate incrementally
    RESERVED("Đang giữ chỗ"),
    SOLD("Đã bán"),
    PROXY_HOLDING("Đại lý giữ hộ"),
    PENDING_RETURN("Chờ trả nhà đài"),
    RETURNED("Đã trả nhà đài"),
    INTERNAL_FAULT("Nhân viên làm hỏng"),
    ISSUER_FAULT("Lỗi in ấn từ nhà cung cấp");

    private final String displayName;
}
