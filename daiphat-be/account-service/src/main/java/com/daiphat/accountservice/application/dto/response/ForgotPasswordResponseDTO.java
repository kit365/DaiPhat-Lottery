package com.daiphat.accountservice.application.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ForgotPasswordResponseDTO {
    String email;
    long expiresIn;     // Số giây còn lại của mã OTP (ví dụ: 300s)
    long retryAfter;    // Số giây phải chờ trước khi được gửi lại mã (ví dụ: 60s, 120s, ...)
}
