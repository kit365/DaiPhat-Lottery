package com.daiphat.coreapi.domain.model.enums.lottery;

/**
 * Kết quả đối soát giữa số tiền nhà đài trả thực tế và tổng claim amount của phiếu nộp.
 */
public enum PrizeClaimSubmissionSettlementStatus {
    /** Nhà đài trả đủ */
    FULL,
    /** Nhà đài trả thiếu — tạo công nợ */
    UNDERPAID,
    /** Nhà đài trả dư — ghi nhận khoản hoàn trả */
    OVERPAID
}
