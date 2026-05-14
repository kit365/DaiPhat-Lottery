package com.daiphat.accountservice.application.dto.request.user;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record OtpConfirmationRequest(
    @NotBlank(message = "Mã OTP không được để trống")
    String otp,
    
    String phoneNumber
) {}
