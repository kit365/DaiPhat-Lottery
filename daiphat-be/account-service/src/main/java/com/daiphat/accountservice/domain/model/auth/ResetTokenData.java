package com.daiphat.accountservice.domain.model.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Dữ liệu tạm thời lưu trữ trong Cache phục vụ quá trình Reset Password.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResetTokenData implements Serializable {
    private String email;
    private String status; // e.g., PENDING, VERIFIED
    private LocalDateTime createdAt;
    private int attemptCount;
}
