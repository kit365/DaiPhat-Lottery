package com.daiphat.accountservice.application.dto.request.mail;

import lombok.Builder;

@Builder
public record AdminResetPasswordSuccessContext(
    String fullName,
    String email,
    String password,
    String loginUrl
) {}
