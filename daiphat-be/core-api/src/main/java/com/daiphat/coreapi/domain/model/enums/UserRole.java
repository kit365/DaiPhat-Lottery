package com.daiphat.coreapi.domain.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum UserRole {
    ADMIN("ROLE_ADMIN"),
    MEMBER("ROLE_MEMBER"),
    STREET_AGENT("ROLE_STREET_AGENT"),
    STAFF_OPERATOR("ROLE_STAFF_OPERATOR");

    private final String code;
}
