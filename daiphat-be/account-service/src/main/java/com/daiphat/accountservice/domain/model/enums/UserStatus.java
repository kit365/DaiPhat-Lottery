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
}
