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
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.response.PasswordPolicyResponseDTO;
import com.daiphat.accountservice.infrastructure.util.AuthUtils;

@RestController
@RequestMapping(ApiConstants.AUTH)
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private static final String FORGOT_PASSWORD = "/forgot-password";
    private static final String DEFAULT_COOKIE_NAME = "refresh_token";

    // Success Messages Consolidation
    private final String MSG_POLICY_FETCHED = "Password policy retrieved successfully.";
    private final String MSG_OTP_SENT = "Mã xác thực đã được gửi về Email của bạn.";
    private final String MSG_OTP_RESENT = "Mã xác thực mới đã được gửi.";
    private final String MSG_OTP_VERIFIED = "OTP verified successfully.";
    private final String MSG_PW_RESET_SUCCESS = "Password has been reset successfully.";
    private final String MSG_LOGIN_SUCCESS = "Login successful.";
    private final String MSG_LOGOUT_SUCCESS = "Logged out successfully.";
    private final String MSG_REGISTER_SUCCESS = "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản của bạn.";
    private final String MSG_VERIFY_EMAIL_SUCCESS = "Xác thực Email thành công! Tài khoản của bạn đã được kích hoạt. Vui lòng đăng nhập để tiếp tục.";
    private final String MSG_RESEND_VERIFY_SUCCESS = "Link xác thực mới đã được gửi về Email của bạn. Vui lòng kiểm tra lại!";
    private final String MSG_REFRESH_TOKEN_SUCCESS = "Token refreshed successfully.";

    private final AuthServicePort authServicePort;
    private final AuthProperties authProperties;
 
    @GetMapping("/password-policy")
    public ResponseEntity<ApiResponseDTO<PasswordPolicyResponseDTO>> getPasswordPolicy() {
        log.info("REST request to get password policy");
        var response = authServicePort.getPasswordPolicy();
        return ResponseEntity.ok(ApiResponseDTO.<PasswordPolicyResponseDTO>builder()
                .data(response)
                .message(MSG_POLICY_FETCHED)
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/request")
    public ResponseEntity<ApiResponseDTO<ForgotPasswordResponseDTO>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDTO request) {
        log.info("REST request to forgot password for email: {}", request.getEmail());
        ForgotPasswordResponseDTO response = authServicePort.forgotPassword(request);
        return ResponseEntity.ok(ApiResponseDTO.<ForgotPasswordResponseDTO>builder()
                .data(response)
                .message(MSG_OTP_SENT)
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/resend")
    public ResponseEntity<ApiResponseDTO<ForgotPasswordResponseDTO>> resendOtp(
            @Valid @RequestBody ForgotPasswordRequestDTO request) {
        log.info("REST request to resend OTP for email: {}", request.getEmail());
        ForgotPasswordResponseDTO response = authServicePort.resendForgotPasswordOtp(request);
        return ResponseEntity.ok(ApiResponseDTO.<ForgotPasswordResponseDTO>builder()
                .data(response)
                .message(MSG_OTP_RESENT)
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/verify")
    public ResponseEntity<ApiResponseDTO<VerifyOtpResponseDTO>> verifyOtp(@Valid @RequestBody VerifyOtpRequestDTO request) {
        VerifyOtpResponseDTO response = authServicePort.verifyResetOtp(request);
        return ResponseEntity.ok(ApiResponseDTO.<VerifyOtpResponseDTO>builder()
                .data(response)
                .message(MSG_OTP_VERIFIED)
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/reset")
    public ResponseEntity<ApiResponseDTO<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDTO request) {
        log.info("REST request to reset password with token: {}", AuthUtils.maskToken(request.getResetToken()));
        authServicePort.resetPassword(request);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message(MSG_PW_RESET_SUCCESS)
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> login(@Valid @RequestBody LoginRequestDTO request) {
        log.info("REST request to login for user: {}", request.getUsername());
        AuthResponseDTO response = authServicePort.login(request);
        
        AuthProperties.Cookie cookieProps = authProperties.getCookie();
        String cookiePath = cookieProps.getPath() != null ? cookieProps.getPath() : ApiConstants.AUTH;

        ResponseCookie cookie = ResponseCookie.from(cookieProps.getName(), response.getRefreshToken())
                .httpOnly(true)
                .secure(cookieProps.isSecure())
                .path(cookiePath)
                .maxAge(response.getRefreshExpiresIn() != null ? response.getRefreshExpiresIn() : 86400)
                .sameSite(cookieProps.getSameSite())
                .build();
                
        response.setRefreshToken(null); // Hardened: move out of JSON body to HttpOnly cookie only
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponseDTO.<AuthResponseDTO>builder()
                        .data(response)
                        .message(MSG_LOGIN_SUCCESS)
                        .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponseDTO<Void>> logout(
            @CookieValue(name = "${daiphat.auth.cookie.name:" + DEFAULT_COOKIE_NAME + "}", required = false) String cookieRefreshToken,
            @RequestBody(required = false) LogoutRequestDTO request,
            Principal principal) {
        
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

        authServicePort.logout(new LogoutRequestDTO(refreshTokenToUse));

        AuthProperties.Cookie cookieProps = authProperties.getCookie();
        String cookiePath = cookieProps.getPath() != null ? cookieProps.getPath() : ApiConstants.AUTH;

        ResponseCookie cookie = ResponseCookie.from(cookieProps.getName(), "")
                .httpOnly(true)
                .secure(cookieProps.isSecure())
                .path(cookiePath)
                .maxAge(0)
                .sameSite(cookieProps.getSameSite())
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponseDTO.<Void>builder()
                        .message(MSG_LOGOUT_SUCCESS)
                        .build());
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponseDTO<Void>> register(@Valid @RequestBody UserRegistrationRequestDTO request) {
        log.info("REST request to register user: {}", request.username());
        authServicePort.register(request);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message(MSG_REGISTER_SUCCESS)
                .build());
    }

    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponseDTO<Void>> verifyEmail(@RequestParam String token) {
        log.info("REST request to verify email with token: {}", AuthUtils.maskToken(token));
        authServicePort.verifyEmail(token);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message(MSG_VERIFY_EMAIL_SUCCESS)
                .build());
    }

    @PostMapping("/register/resend-verification")
    public ResponseEntity<ApiResponseDTO<Void>> resendVerification(@RequestParam String email) {
        log.info("REST request to resend verification email for: {}", email);
        authServicePort.resendVerificationEmail(email);
        return ResponseEntity.ok(ApiResponseDTO.<Void>builder()
                .message(MSG_RESEND_VERIFY_SUCCESS)
                .build());
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> refreshToken(
            @CookieValue(name = "${daiphat.auth.cookie.name:" + DEFAULT_COOKIE_NAME + "}", required = false) String cookieRefreshToken,
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

        AuthProperties.Cookie cookieProps = authProperties.getCookie();
        String cookiePath = cookieProps.getPath() != null ? cookieProps.getPath() : ApiConstants.AUTH;

        ResponseCookie cookie = ResponseCookie.from(cookieProps.getName(), response.getRefreshToken() != null ? response.getRefreshToken() : refreshTokenToUse)
                .httpOnly(true)
                .secure(cookieProps.isSecure())
                .path(cookiePath)
                .maxAge(response.getRefreshExpiresIn() != null ? response.getRefreshExpiresIn() : 86400)
                .sameSite(cookieProps.getSameSite())
                .build();

        response.setRefreshToken(null); // Hardened: move out of JSON body to HttpOnly cookie only
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponseDTO.<AuthResponseDTO>builder()
                        .data(response)
                        .message(MSG_REFRESH_TOKEN_SUCCESS)
                        .build());
    }
}
