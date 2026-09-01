package com.daiphat.coreapi.domain.model.enums.lottery;

/** Kết quả ghi nhận cho từng dòng vé khi phiếu đang HANDED_OVER. */
public enum PrizeClaimLineOutcome {
    HANDED_OVER,
    REJECTED_RETRYABLE,
    REJECTED_LOSS,
    REJECTED_FRAUD,
    LOST
}
