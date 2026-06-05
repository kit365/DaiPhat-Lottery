package com.daiphat.coreapi.domain.model.enums.email;

import lombok.Getter;
import lombok.RequiredArgsConstructor;


@Getter
@RequiredArgsConstructor
public enum EmailType {
    WELCOME_VERIFY("WELCOME_VERIFY"),
    FORGOT_PW_OTP("FORGOT_PW_OTP"),
    ADMIN_CREATE_USER("ADMIN_CREATE_USER"),
    ADMIN_RESET_PASSWORD_OTP("ADMIN_RESET_PASSWORD_OTP"),
    ADMIN_RESET_PASSWORD_SUCCESS("ADMIN_RESET_PASSWORD_SUCCESS"),
    STAFF_INVITE("STAFF_INVITE");

    private final String value;
}
