package com.daiphat.coreapi.domain.model.enums.support;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TicketStatus implements LabeledEnum {
    OPEN("Mới tạo"),
    IN_PROGRESS("Đang xử lý"),
    WAITING_FOR_CUSTOMER("Chờ khách phản hồi"),
    RESOLVED("Đã giải quyết"),
    REJECTED("Đã từ chối"),
    CLOSED("Đã đóng");

    private final String label;
}
