package com.daiphat.coreapi.domain.model.enums.user;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Trạng thái của lời mời nhân sự.
 */
@Getter
@RequiredArgsConstructor
public enum InviteStatus {
    PENDING("PENDING"),   // Chờ xác nhận/Chưa kích hoạt
    APPROVED("APPROVED"),  // Đã được chấp nhận/Cho phép login
    EXPIRED("EXPIRED"),   // Hết hạn
    REVOKED("REVOKED");   // Đã bị thu hồi

    private final String code;
}
