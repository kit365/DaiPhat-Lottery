package com.daiphat.coreapi.domain.model.enums.blog;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CategoryStatus {
    ACTIVE("ACTIVE", "Hoạt động"),
    INACTIVE("INACTIVE", "Ngưng hoạt động");

    private final String code;
    private final String label;

    public static CategoryStatus fromCode(String code) {
        if (code == null) {
            return ACTIVE;
        }
        for (CategoryStatus status : CategoryStatus.values()) {
            if (status.getCode().equalsIgnoreCase(code)) {
                return status;
            }
        }
        return ACTIVE;
    }
}
