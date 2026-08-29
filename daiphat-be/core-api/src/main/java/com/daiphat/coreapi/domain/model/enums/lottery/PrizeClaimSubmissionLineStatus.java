package com.daiphat.coreapi.domain.model.enums.lottery;

/**
 * Trạng thái dòng vé trong phiếu nộp.
 *
 * <ul>
 *   <li>{@code PENDING}: chờ nhà đài xác nhận
 *   <li>{@code CONFIRMED}: nhà đài đồng ý
 *   <li>{@code REJECTED_RETRYABLE}: nhà đài từ chối có thể nộp lại → serial được giải phóng
 *   <li>{@code REJECTED_FINAL}: nhà đài từ chối vĩnh viễn (gian lận, vé giả) → serial bị khóa, không cho add vào submission nào
 *   <li>{@code PAID}: đã được thanh toán
 *   <li>{@code WITHDRAWN}: submission cha bị cancel → serial được giải phóng, nằm ngoài unique index guard
 * </ul>
 */
public enum PrizeClaimSubmissionLineStatus {
    PENDING,
    CONFIRMED,
    REJECTED_RETRYABLE,
    REJECTED_FINAL,
    PAID,
    /** Submission cha bị cancel → serial được giải phóng, nằm ngoài unique index */
    WITHDRAWN
}
