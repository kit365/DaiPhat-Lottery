package com.daiphat.coreapi.domain.model.enums.settings;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConfigType implements LabeledEnum {
    GENERAL_SETTING("Cài đặt chung"),
    STATIC_PAGE("Trang tĩnh / Chính sách"),
    ORDER_SETTING("Cấu hình đơn hàng"),
    PAYMENT_SETTING("Cấu hình thanh toán"),
    TICKET_IMPORT("Cấu hình nhập vé"),
    TICKET_RETURN("Cấu hình trả vé"),
    VENDOR_SETTING("Cấu hình người bán dạo"),
    REFUND_SETTING("Cấu hình hoàn tiền"),
    COMPLAINT_SETTING("Cấu hình khiếu nại"),
    PAYOUT_SETTING("Cấu hình trả thưởng"),
    FORTUNE_SETTING("Cấu hình gieo quẻ");

    private final String label;
}
