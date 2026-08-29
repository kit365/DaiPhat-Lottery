package com.daiphat.coreapi.domain.model.enums.payout;

public enum PrizePayoutRequestStatus {
    PENDING,
    /** High-value IN_PERSON claim approved by a second staff member (four-eyes). */
    APPROVED,
    /**
     * Đã thanh toán đủ — hoàn tất.
     * Cũng dùng làm trạng thái cuối khi {@code COMPLETED} qua writeOffRemaining.
     */
    COMPLETED,
    REJECTED,
    /** Online claim locked after too many staff rejects — customer must go to agent. */
    MANUAL_RESOLUTION,
    /**
     * Quỹ đại lý không đủ trả toàn bộ — tạm dừng, chờ tiền về từ nhà đài.
     * Khi đủ quỹ → gọi payFinalInstallment để hoàn tất.
     */
    AWAITING_FUND,
    CANCELLED
}
