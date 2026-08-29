package com.daiphat.coreapi.domain.model.enums.lottery;

/** Trạng thái phiếu nộp vé trúng thưởng cho nhà đài. */
public enum PrizeClaimSubmissionStatus {
    /** Nháp — đang thêm vé, chưa gửi */
    DRAFT,
    /** Đã gửi nộp cho nhà đài — mang vé đến */
    SUBMITTED,
    /** Nhà đài đã xác nhận đã nhận vé — chờ thanh toán */
    CONFIRMED,
    /** Chờ thanh toán từ nhà đài */
    PAYMENT_PENDING,
    /** Nhà đài đã thanh toán đủ */
    COMPLETED,
    /** Bị hủy — có thể ở bất kỳ trạng thái nào (DRAFT tự do; SUBMITTED+ cần maker-checker) */
    CANCELLED
}
