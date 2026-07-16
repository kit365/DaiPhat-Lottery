package com.daiphat.coreapi.domain.model.enums.order;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OrderCancelType implements LabeledEnum {
    CUSTOMER_REQUEST("Khách hàng hủy đơn"),
    ADMIN_FORCE_CANCEL("Nhân viên hủy đơn hộ khách"),
    SYSTEM_PAYMENT_TIMEOUT("Hủy do quá hạn thanh toán"),
    OUT_OF_STOCK_INCIDENT("Hủy do sự cố kho / hết vé thay thế");

    private final String label;
}
