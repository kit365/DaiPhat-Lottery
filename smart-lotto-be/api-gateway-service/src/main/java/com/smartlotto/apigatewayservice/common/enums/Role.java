package com.smartlotto.apigatewayservice.common.enums;

import lombok.Getter;

@Getter
public enum Role {
    STUDENT("STUDENT"),
    TUTOR("TUTOR"),
    HOST("HOST"),
    ADMIN("ADMIN"),
    SUPER_ADMIN("SUPER_ADMIN");

    private final String name;

    Role(String name) {
        this.name = name;
    }
}
