package com.daiphat.coreapi.domain.model.enums.settings;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConfigType implements LabeledEnum {
    ORDER_SETTING("Cấu hình đơn hàng"),
    PAYMENT_SETTING("Cấu hình thanh toán"),
    TICKET_IMPORT("Cấu hình nhập vé"),
    TICKET_RETURN("Cấu hình trả vé"),
    REFUND_SETTING("Cấu hình hoàn tiền"),
    COMPLAINT_SETTING("Cấu hình khiếu nại"),
    PAYOUT_SETTING("Cấu hình trả thưởng");

    private final String label;
}
