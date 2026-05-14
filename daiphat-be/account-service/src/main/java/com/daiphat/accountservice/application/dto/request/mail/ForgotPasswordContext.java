package com.daiphat.accountservice.application.dto.request.mail;

import lombok.Builder;

@Builder
public record ForgotPasswordContext(
    String email,
    String otp
) {}
