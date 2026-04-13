package com.daiphat.accountservice.presentation.controller;

import com.daiphat.accountservice.application.dto.request.ForgotPasswordRequestDTO;
import com.daiphat.accountservice.application.dto.request.LoginRequestDTO;
import com.daiphat.accountservice.application.dto.request.LogoutRequestDTO;
import com.daiphat.accountservice.application.dto.request.RefreshTokenRequestDTO;
import com.daiphat.accountservice.application.dto.request.ResetPasswordRequestDTO;
import com.daiphat.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.daiphat.accountservice.application.dto.request.VerifyOtpRequestDTO;
import com.daiphat.accountservice.application.dto.response.ApiResponseDTO;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;
import com.daiphat.accountservice.application.dto.response.ForgotPasswordResponseDTO;
import com.daiphat.accountservice.application.dto.response.VerifyOtpResponseDTO;
import com.daiphat.accountservice.application.port.in.AuthServicePort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.presentation.constants.ApiConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.AUTH)
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private static final String FORGOT_PASSWORD = "/forgot-password";
    private final AuthServicePort authServicePort;
 
    @org.springframework.web.bind.annotation.GetMapping("/password-policy")
    public ResponseEntity<ApiResponseDTO<com.daiphat.accountservice.application.dto.response.PasswordPolicyResponseDTO>> getPasswordPolicy() {
        log.info("REST request to get password policy");
        var response = authServicePort.getPasswordPolicy();
        return ResponseEntity.ok(ApiResponseDTO.<com.daiphat.accountservice.application.dto.response.PasswordPolicyResponseDTO>builder()
                .data(response)
                .message("Password policy retrieved successfully.")
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/request")
    public ResponseEntity<ApiResponseDTO<ForgotPasswordResponseDTO>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDTO request) {
        log.info("REST request to forgot password for email: {}", request.getEmail());
        ForgotPasswordResponseDTO response = authServicePort.forgotPassword(request);
        return ResponseEntity.ok(ApiResponseDTO.<ForgotPasswordResponseDTO>builder()
                .data(response)
                .message("Mã xác thực đã được gửi về Email của bạn.")
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/resend")
    public ResponseEntity<ApiResponseDTO<ForgotPasswordResponseDTO>> resendOtp(
            @Valid @RequestBody ForgotPasswordRequestDTO request) {
        log.info("REST request to resend OTP for email: {}", request.getEmail());
        ForgotPasswordResponseDTO response = authServicePort.resendForgotPasswordOtp(request);
        return ResponseEntity.ok(ApiResponseDTO.<ForgotPasswordResponseDTO>builder()
                .data(response)
                .message("Mã xác thực mới đã được gửi.")
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/verify")
    public ResponseEntity<ApiResponseDTO<VerifyOtpResponseDTO>> verifyOtp(@Valid @RequestBody VerifyOtpRequestDTO request) {
        VerifyOtpResponseDTO response = authServicePort.verifyResetOtp(request);
        return ResponseEntity.ok(ApiResponseDTO.<VerifyOtpResponseDTO>builder()
                .data(response)
                .message("OTP verified successfully.")
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/reset")
    public ResponseEntity<ApiResponseDTO<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDTO request) {
        log.info("REST request to reset password");
        authServicePort.resetPassword(request);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message("Password has been reset successfully.")
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> login(@Valid @RequestBody LoginRequestDTO request) {
        log.info("REST request to login for user: {}", request.getUsername());
        AuthResponseDTO response = authServicePort.login(request);
        
        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("refresh_token", response.getRefreshToken())
                .httpOnly(true)
                .secure(false)
                .path("/api/v1/auth")
                .maxAge(response.getRefreshExpiresIn() != null ? response.getRefreshExpiresIn() : 86400) // Default 1 day if null
                .sameSite("Lax")
                .build();
                
        response.setRefreshToken(null);

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponseDTO.<AuthResponseDTO>builder()
                        .data(response)
                        .message("Login successful.")
                        .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponseDTO<Void>> logout(
            @org.springframework.web.bind.annotation.CookieValue(name = "refresh_token", required = false) String cookieRefreshToken,
            @RequestBody(required = false) LogoutRequestDTO request,
            java.security.Principal principal) {
        
        log.info("REST request to logout");
        
        String refreshTokenToUse = null;
        if (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank()) {
            refreshTokenToUse = request.getRefreshToken();
        } else if (cookieRefreshToken != null && !cookieRefreshToken.isBlank()) {
            refreshTokenToUse = cookieRefreshToken;
        }

        if (principal == null && (refreshTokenToUse == null || refreshTokenToUse.isBlank())) {
            log.warn("Logout attempt without active session or refresh token.");
            throw new DomainException(ErrorCode.UNAUTHORIZED);
        }

        // Thực hiện logout thông qua service
        authServicePort.logout(new LogoutRequestDTO(refreshTokenToUse));

        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(false) // Local development
                .path("/api/v1/auth")
                .maxAge(0) // Expire immediately
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponseDTO.<Void>builder()
                        .message("Logged out successfully.")
                        .build());
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponseDTO<Void>> register(@Valid @RequestBody UserRegistrationRequestDTO request) {
        log.info("REST request to register user: {}", request.username());
        authServicePort.register(request);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message("Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản của bạn.")
                .build());
    }

    @org.springframework.web.bind.annotation.GetMapping("/verify-email")
    public ResponseEntity<ApiResponseDTO<Void>> verifyEmail(@org.springframework.web.bind.annotation.RequestParam String token) {
        log.info("REST request to verify email with token: {}", token);
        authServicePort.verifyEmail(token);
        
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message("Xác thực Email thành công! Tài khoản của bạn đã được kích hoạt. Vui lòng đăng nhập để tiếp tục.")
                .build());
    }

    @PostMapping("/register/resend-verification")
    public ResponseEntity<ApiResponseDTO<Void>> resendVerification(@org.springframework.web.bind.annotation.RequestParam String email) {
        log.info("REST request to resend verification email for: {}", email);
        authServicePort.resendVerificationEmail(email);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message("Link xác thực mới đã được gửi về Email của bạn. Vui lòng kiểm tra lại nhe sếp!")
                .build());
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> refreshToken(
            @org.springframework.web.bind.annotation.CookieValue(name = "refresh_token", required = false) String cookieRefreshToken,
            @RequestBody(required = false) RefreshTokenRequestDTO request) {
                
        log.info("REST request to refresh token");
        
        String refreshTokenToUse = null;
        if (cookieRefreshToken != null && !cookieRefreshToken.isBlank()) {
            refreshTokenToUse = cookieRefreshToken;
        } else if (request != null && request.getRefreshToken() != null) {
            refreshTokenToUse = request.getRefreshToken();
        }
        
        if (refreshTokenToUse == null || refreshTokenToUse.isBlank()) {
            throw new DomainException(ErrorCode.UNAUTHORIZED);
        }
        
        RefreshTokenRequestDTO activeRequest = new RefreshTokenRequestDTO(refreshTokenToUse);
        AuthResponseDTO response = authServicePort.refreshToken(activeRequest);

        org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("refresh_token", response.getRefreshToken() != null ? response.getRefreshToken() : refreshTokenToUse)
                .httpOnly(true)
                .secure(false) // Local development
                .path("/api/v1/auth")
                .maxAge(response.getRefreshExpiresIn() != null ? response.getRefreshExpiresIn() : 86400)
                .sameSite("Lax")
                .build();
                
        response.setRefreshToken(null);

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponseDTO.<AuthResponseDTO>builder()
                        .data(response)
                        .message("Token refreshed successfully.")
                        .build());
    }
}
