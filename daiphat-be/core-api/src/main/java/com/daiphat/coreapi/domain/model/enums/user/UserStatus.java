package com.daiphat.coreapi.domain.model.enums.user;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.CodedLabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Trạng thái của người dùng trong hệ thống.
 */
@Getter
@RequiredArgsConstructor
public enum UserStatus implements CodedLabeledEnum {
    ACTIVE("ACTIVE", "Hoạt động"),
    PENDING("PENDING", "Chờ xử lý"),
    INTERNAL("INTERNAL", "Hồ sơ nội bộ"),
    LOCKED("LOCKED", "Bị khóa"),
    BANNED("BANNED", "Bị cấm"),
    DELETED("DELETED", "Đã xóa");

    private final String code;
    private final String label;

    public static UserStatus fromCode(String code) {
        for (UserStatus status : UserStatus.values()) {
            if (status.getCode().equals(code)) {
                return status;
            }
        }
        return PENDING; // Default
    }

    public static UserStatus from(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return UserStatus.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(
                ErrorCode.INVALID_INPUT,
                "Trạng thái không hợp lệ: " + raw
            );
        }
    }

    public static UserStatus fromFilter(String raw) {
        if (raw == null || raw.isBlank() || "ALL".equalsIgnoreCase(raw)) {
            return null;
        }
        try {
            return UserStatus.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null; // Ignore invalid filters
        }
    }
}
