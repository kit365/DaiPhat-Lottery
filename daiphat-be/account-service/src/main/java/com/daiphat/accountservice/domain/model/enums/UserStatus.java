package com.daiphat.accountservice.domain.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Trạng thái của người dùng trong hệ thống.
 */
@Getter
@RequiredArgsConstructor
public enum UserStatus {
    ACTIVE("ACTIVE"),
    PENDING("PENDING"),
    LOCKED("LOCKED"),
    BANNED("BANNED"),
    DELETED("DELETED");

    private final String code;

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
            throw new com.daiphat.accountservice.domain.exception.DomainException(
                com.daiphat.accountservice.domain.exception.ErrorCode.INVALID_INPUT, 
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
