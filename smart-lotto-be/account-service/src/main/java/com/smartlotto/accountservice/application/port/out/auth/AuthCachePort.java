package com.smartlotto.accountservice.application.port.out.auth;

import com.smartlotto.accountservice.domain.model.auth.ResetTokenData;
import java.time.Duration;
import java.util.Optional;

/**
 * Port quản lý Cache cho các tác vụ liên quan đến Xác thực & Bảo mật.
 * Bao gồm: Token, OTP, Quên mật khẩu, và Khóa tài khoản.
 */
public interface AuthCachePort {
    
    // ✅ Login/Token
    void saveToken(String userId, String token, Duration duration);
    Optional<String> getToken(String userId);
    void revokeToken(String userId);
    boolean isTokenValid(String userId);
    
    void saveRefreshToken(String userId, String token, Duration duration);
    Optional<String> getRefreshToken(String userId);
    
    // ✅ Forgot Password
    void saveResetToken(String email, String resetToken, Duration duration);
    Optional<String> getResetToken(String email);
    void deleteResetToken(String email);
    
    void saveResetTokenData(String resetToken, ResetTokenData data, Duration duration);
    Optional<ResetTokenData> getResetTokenData(String resetToken);
    
    void incrementResetAttempt(String email);
    int getResetAttemptCount(String email);
    void resetAttemptCount(String email);
    
    // ✅ OTP/Verification
    void saveOtp(String email, String otp, Duration duration);
    Optional<String> getOtp(String email);
    void deleteOtp(String email);
    
    // ✅ Account Lock
    void lockAccount(String email, Duration duration);
    boolean isAccountLocked(String email);
    void unlockAccount(String email);
}
