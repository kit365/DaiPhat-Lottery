package com.daiphat.coreapi.domain.model.enums.notification;

public enum NotificationReferenceType {
    AUTH,
    BLOG_POST,
    ORDER,
    /** @deprecated Prefer {@link #REFUND_REQUEST}; kept for legacy notification rows. */
    @Deprecated
    REFUND,
    REFUND_REQUEST,
    PRIZE_PAYOUT_REQUEST,
    LOTTERY_STATION,
    SYSTEM,
    SUPPORT_TICKET
}
