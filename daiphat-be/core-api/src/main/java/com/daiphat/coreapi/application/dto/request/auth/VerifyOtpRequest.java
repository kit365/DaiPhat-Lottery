package com.daiphat.coreapi.application.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VerifyOtpRequest {
    public static final String MSG_EMAIL_REQUIRED = "Email không được để trống";
    public static final String MSG_EMAIL_INVALID = "Email không hợp lệ";
    public static final String MSG_OTP_REQUIRED = "OTP không được để trống";
    public static final String MSG_OTP_FORMAT = "OTP phải là 6 ký tự số";

    @NotBlank(message = MSG_EMAIL_REQUIRED)
    @Email(message = MSG_EMAIL_INVALID)
    String email;

    @NotBlank(message = MSG_OTP_REQUIRED)
    @Size(min = 6, max = 6, message = MSG_OTP_FORMAT)
    @Pattern(regexp = "^[0-9]{6}$", message = MSG_OTP_FORMAT)
    String otp;
}
