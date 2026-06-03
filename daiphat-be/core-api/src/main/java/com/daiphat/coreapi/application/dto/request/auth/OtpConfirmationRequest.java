package com.daiphat.coreapi.application.dto.request.auth;

import jakarta.validation.constraints.NotBlank;

public record OtpConfirmationRequest(
        @NotBlank(message = "OTP không được để trống")
        String otp
) {
}
