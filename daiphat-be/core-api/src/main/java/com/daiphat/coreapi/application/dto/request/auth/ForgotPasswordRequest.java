package com.daiphat.coreapi.application.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
public class ForgotPasswordRequest {
    public static final String MSG_EMAIL_REQUIRED = "Email không được để trống";
    public static final String MSG_EMAIL_INVALID = "Email không hợp lệ";

    @NotBlank(message = MSG_EMAIL_REQUIRED)
    @Email(message = MSG_EMAIL_INVALID)
    String email;
}
