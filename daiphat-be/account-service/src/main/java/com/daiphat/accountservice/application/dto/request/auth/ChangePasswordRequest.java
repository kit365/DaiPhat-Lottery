package com.daiphat.accountservice.application.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChangePasswordRequest {
    public static final String MSG_PASSWORD_REQUIRED = "Mật khẩu không được để trống";
    public static final String MSG_PASSWORD_SIZE = "Mật khẩu phải từ 6 đến 100 ký tự";
    public static final String MSG_PASSWORD_PATTERN = "Mật khẩu phải bắt đầu bằng chữ hoa và không có khoảng trắng";

    @NotBlank(message = MSG_PASSWORD_REQUIRED)
    @Size(min = 6, max = 100, message = MSG_PASSWORD_SIZE)
    @Pattern(regexp = "^[A-Z][^\\s]{5,99}$", message = MSG_PASSWORD_PATTERN)
    String newPassword;
}
