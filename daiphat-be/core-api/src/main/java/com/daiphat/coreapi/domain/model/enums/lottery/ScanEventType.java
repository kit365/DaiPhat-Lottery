package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Lottery_Scan_Log.eventType — what happened during one step of a ticket scan/verify flow. */
@Getter
@RequiredArgsConstructor
public enum ScanEventType {
    SCAN_STARTED("Bắt đầu phiên scan"),
    OCR_COMPLETED("OCR đọc xong dữ liệu"),
    MANUAL_INPUT("Nhân viên nhập tay thay vì dùng OCR"),
    VERIFY_PASSED("Nhân viên verify thành công"),
    VERIFY_FAILED("Nhân viên verify thất bại"),
    TICKET_CREATED("Đã tạo vé số thành công"),
    TICKET_FOUND("Tìm thấy vé số trong hệ thống"),
    TICKET_NOT_FOUND("Không tìm thấy vé số trong hệ thống"),
    INVALID_TICKET("Vé không hợp lệ"),
    SCAN_COMPLETED("Kết thúc quá trình scan");

    private final String displayName;
}
