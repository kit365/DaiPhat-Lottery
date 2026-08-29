package com.daiphat.coreapi.domain.model.enums.lottery;

/** Lý do nhà đài từ chối vé trong phiếu nộp. */
public enum PrizeClaimRejectionReason {
    /** Vé rách, không đọc được */
    PAPER_DAMAGED,
    /** Vé không thuộc nhà đài này */
    WRONG_STATION,
    /** Nghi ngờ gian lận / vé giả */
    FRAUD_SUSPECTED,
    /** Vé đã được claim trước đó */
    DUPLICATE_CLAIM,
    /** Vé hết hạn đổi thưởng */
    EXPIRED,
    /** Lý do khác */
    OTHER
}
