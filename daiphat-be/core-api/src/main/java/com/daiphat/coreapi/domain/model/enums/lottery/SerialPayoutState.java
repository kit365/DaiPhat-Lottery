package com.daiphat.coreapi.domain.model.enums.lottery;

public enum SerialPayoutState {
    NONE,
    PAYOUT_PENDING,
    PAID_OUT,
    /** Serial bị khóa do nhà đài nghi ngờ gian lận — không cho add vào submission nào. */
    LOCKED_FRAUD_SUSPECTED,
    /** Vé rách/hết hạn — không thể nộp lại. */
    UNRECOVERABLE,
    /** Vé thất lạc trong quá trình nộp. */
    LOST
}
