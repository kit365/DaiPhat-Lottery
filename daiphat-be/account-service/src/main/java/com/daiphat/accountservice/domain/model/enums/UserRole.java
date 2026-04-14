package com.daiphat.accountservice.domain.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum UserRole {
    ADMIN("ROLE_ADMIN"),
    MEMBER("ROLE_MEMBER"),
    STAFF_SHIPPER("ROLE_STAFF_SHIPPER"),
    STAFF_MANAGER("ROLE_STAFF_MANAGER");

    private final String code;
}
