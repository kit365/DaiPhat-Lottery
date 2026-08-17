package com.daiphat.coreapi.domain.model.enums.order.detail;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OrderDetailStatus implements LabeledEnum {
    /** The paid ticket is held by the company before staff starts the handover. */
    PROXY_HOLDING("Công ty đang giữ vé"),
    /** Staff is checking the ticket against the customer at the counter. */
    HANDOVER_IN_PROGRESS("Đang bàn giao"),
    HANDED_OVER("Đã bàn giao"),
    REJECTED_BY_CUSTOMER("Khách từ chối nhận"),
    REFUND_PENDING("Chờ hoàn tiền"),
    REFUNDED("Đã hoàn tiền"),
    /**
     * The parent order was cancelled before this line entered a refund lifecycle.
     * This prevents a released serial from being discovered as an active handover.
     */
    CANCELLED("Đã hủy");

    private final String label;
}
