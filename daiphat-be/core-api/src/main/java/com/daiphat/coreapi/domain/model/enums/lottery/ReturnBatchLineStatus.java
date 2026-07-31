package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReturnBatchLineStatus {
    PENDING("Đang đợi đi trả vé"),
    SUCCESS("Trả vé thành công"),
    REJECTED_BY_SUPPLIER("Nhà cung cấp từ chối"),
    PULLED_FOR_SALE("Đã lấy bán trong lúc trả");

    private final String label;
}
