package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Trạng thái phiếu nộp vé trúng thưởng cho nhà đài. */
@Getter
@RequiredArgsConstructor
public enum PrizeClaimSubmissionStatus {
    /** Nháp — đang thêm vé */
    DRAFT("Nháp"),
    /** Đang kiểm tra danh sách vé */
    INSPECTING("Đang kiểm tra"),
    /** Đã kiểm xong — chờ bàn giao vật lý */
    PENDING_HANDOVER("Chờ bàn giao"),
    /** Đã bàn giao — chờ ghi nhận kết quả từng vé */
    HANDED_OVER("Đã bàn giao"),
    /** Tất cả vé đã có kết quả */
    CLOSED("Đã đóng"),
    /** Bị hủy trước khi bàn giao */
    CANCELLED("Đã hủy");

    private final String label;

    public boolean isOpenForEditing() {
        return this == DRAFT || this == INSPECTING;
    }

    public boolean isCancellable() {
        return this == DRAFT || this == INSPECTING || this == PENDING_HANDOVER;
    }

    public boolean isAwaitingOutcomes() {
        return this == HANDED_OVER;
    }
}
