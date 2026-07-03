package com.daiphat.coreapi.domain.model.enums.chat;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ConversationCloseReason {
    RESOLVED("Đã giải quyết"),
    CUSTOMER_NO_RESPONSE("Khách không phản hồi"),
    SPAM("Spam"),
    OTHER("Khác"),
    AUTO_INACTIVITY("Tự đóng do không hoạt động");

    private final String label;
}
