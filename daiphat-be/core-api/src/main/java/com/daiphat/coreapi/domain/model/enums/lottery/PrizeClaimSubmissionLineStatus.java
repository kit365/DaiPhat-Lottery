package com.daiphat.coreapi.domain.model.enums.lottery;

/**
 * Trạng thái dòng vé trong phiếu nộp.
 */
public enum PrizeClaimSubmissionLineStatus {
    /** Đã chọn vào phiếu — đang kiểm */
    SELECTED,
    /** Đã kiểm xong — sẵn sàng bàn giao */
    INSPECTED,
    /** Đã bàn giao — chờ nhà đài xử lý */
    AWAITING_OUTCOME,
    /** Nhà đài đã nhận vé */
    HANDED_OVER,
    /** Nhà đài từ chối — có thể nộp lại (tối đa 2 lần) */
    REJECTED_RETRYABLE,
    /** Từ chối vĩnh viễn — vé rách/hết hạn */
    REJECTED_LOSS,
    /** Nghi ngờ gian lận — serial bị khóa */
    REJECTED_FRAUD,
    /** Vé thất lạc trong quá trình nộp */
    LOST;

    public boolean isActive() {
        return this == SELECTED || this == INSPECTED || this == AWAITING_OUTCOME;
    }

    public boolean isTerminal() {
        return !isActive();
    }
}
