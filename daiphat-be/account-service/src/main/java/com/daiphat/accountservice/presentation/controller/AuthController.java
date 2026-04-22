package com.daiphat.accountservice.presentation.controller;

import com.daiphat.accountservice.application.dto.request.auth.ForgotPasswordRequest;
import com.daiphat.accountservice.application.dto.request.auth.LoginRequest;
import com.daiphat.accountservice.application.dto.request.auth.LogoutRequest;
import com.daiphat.accountservice.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.accountservice.application.dto.request.auth.ResetPasswordRequest;
import com.daiphat.accountservice.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.accountservice.application.dto.request.auth.VerifyOtpRequest;
import com.daiphat.accountservice.application.dto.response.base.ApiResponse;
import com.daiphat.accountservice.application.dto.response.auth.AuthResponse;
import com.daiphat.accountservice.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.accountservice.application.dto.response.auth.VerifyOtpResponse;
import com.daiphat.accountservice.application.port.in.auth.AuthServicePort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.presentation.constants.ApiConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import com.daiphat.accountservice.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import java.security.Principal;
import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.response.auth.PasswordPolicyResponse;
import com.daiphat.accountservice.infrastructure.util.AuthUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.AUTH)
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private static final String FORGOT_PASSWORD = "/forgot-password";
    private static final String DEFAULT_COOKIE_NAME = "refresh_token";
    private static final String MSG_POLICY_FETCHED = "Lấy quy tắc mật khẩu thành công.";
    private static final String MSG_OTP_SENT = "Mã xác thực đã được gửi về Email của bạn.";
    private static final String MSG_OTP_RESENT = "Mã xác thực mới đã được gửi.";
    private static final String MSG_OTP_VERIFIED = "Xác thực mã OTP thành công.";
    private static final String MSG_PW_RESET_SUCCESS = "Mật khẩu của bạn đã được đặt lại thành công.";
    private static final String MSG_LOGIN_SUCCESS = "Đăng nhập thành công.";
    private static final String MSG_LOGOUT_SUCCESS = "Đăng xuất thành công.";
    private static final String MSG_REGISTER_SUCCESS = "Đăng ký thành công! Vui lòng kiểm tra email để "
            + "xác thực tài khoản của bạn.";
    private static final String MSG_VERIFY_EMAIL_SUCCESS = "Xác thực Email thành công! Tài khoản của "
            + "bạn đã được kích hoạt. Vui lòng đăng nhập để tiếp tục.";
    private static final String MSG_RESEND_VERIFY_SUCCESS = "Link xác thực mới đã được gửi về Email của bạn. "
            + "Vui lòng kiểm tra lại!";
    private static final String MSG_REFRESH_TOKEN_SUCCESS = "Làm mới mã định danh thành công.";

    private final AuthServicePort authServicePort;
    private final AuthProperties authProperties;

    @GetMapping("/password-policy")
    public ResponseEntity<ApiResponse<PasswordPolicyResponse>> getPasswordPolicy() {
        log.info("REST request to get password policy");
        var response = authServicePort.getPasswordPolicy();
        return ResponseEntity.ok(ApiResponse.<PasswordPolicyResponse>builder()
                .data(response)
                .message(MSG_POLICY_FETCHED)
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/request")
    public ResponseEntity<ApiResponse<ForgotPasswordResponse>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        log.info("REST request to forgot password for email: {}", request.getEmail());
        ForgotPasswordResponse response = authServicePort.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.<ForgotPasswordResponse>builder()
                .data(response)
                .message(MSG_OTP_SENT)
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/resend")
    public ResponseEntity<ApiResponse<ForgotPasswordResponse>> resendOtp(
            @Valid @RequestBody ForgotPasswordRequest request) {
        log.info("REST request to resend OTP for email: {}", request.getEmail());
        ForgotPasswordResponse response = authServicePort.resendForgotPasswordOtp(request);
        return ResponseEntity.ok(ApiResponse.<ForgotPasswordResponse>builder()
                .data(response)
                .message(MSG_OTP_RESENT)
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/verify")
    public ResponseEntity<ApiResponse<VerifyOtpResponse>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {
        VerifyOtpResponse response = authServicePort.verifyResetOtp(request);
        return ResponseEntity.ok(ApiResponse.<VerifyOtpResponse>builder()
                .data(response)
                .message(MSG_OTP_VERIFIED)
                .build());
    }

    @PostMapping(FORGOT_PASSWORD + "/reset")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        log.info("REST request to reset password with token: {}", AuthUtils.maskToken(request.getResetToken()));
        authServicePort.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message(MSG_PW_RESET_SUCCESS)
                .build());
    }

    @PostMapping("/login")
    @JsonView(Views.Me.class)
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("REST request to login for user: {}", request.getUsername());
        AuthResponse response = authServicePort.login(request);

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
                .body(ApiResponse.<AuthResponse>builder()
                                .data(response)
                                .message(MSG_LOGIN_SUCCESS)
                                .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(name = "${daiphat.auth.cookie.name:" + DEFAULT_COOKIE_NAME
                        + "}", required = false) String cookieRefreshToken,
            Principal principal) {

        log.info("REST request to logout");

        String refreshTokenToUse = cookieRefreshToken;

        if (principal == null && (refreshTokenToUse == null || refreshTokenToUse.isBlank())) {
            log.info("Logout requested but no active session or refresh token found. "
                    + "Returning success for idempotency.");
        } else {
            try {
                authServicePort.logout(new LogoutRequest(refreshTokenToUse));
            } catch (Exception e) {
                log.warn("Backend logout failed or was already invalidated: {}", e.getMessage());
            }
        }

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
                .body(ApiResponse.<Void>builder()
                                .message(MSG_LOGOUT_SUCCESS)
                                .build());
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody UserRegistrationRequest request) {
        log.info("REST request to register user: {}", request.username());
        authServicePort.register(request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message(MSG_REGISTER_SUCCESS)
                .build());
    }

    @GetMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam String token) {
        log.info("REST request to verify email with token: {}", AuthUtils.maskToken(token));
        authServicePort.verifyEmail(token);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message(MSG_VERIFY_EMAIL_SUCCESS)
                .build());
    }

    @PostMapping("/register/resend-verification")
    public ResponseEntity<ApiResponse<Void>> resendVerification(@RequestParam String email) {
        log.info("REST request to resend verification email for: {}", email);
        authServicePort.resendVerificationEmail(email);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message(MSG_RESEND_VERIFY_SUCCESS)
                .build());
    }

    @PostMapping("/refresh-token")
    @JsonView(Views.Me.class)
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @CookieValue(name = "${daiphat.auth.cookie.name:" + DEFAULT_COOKIE_NAME
                        + "}", required = false) String cookieRefreshToken) {

        log.info("REST request to refresh token");

        String refreshTokenToUse = cookieRefreshToken;

        if (refreshTokenToUse == null || refreshTokenToUse.isBlank()) {
            throw new DomainException(ErrorCode.UNAUTHORIZED);
        }

        RefreshTokenRequest activeRequest = new RefreshTokenRequest(refreshTokenToUse);
        AuthResponse response = authServicePort.refreshToken(activeRequest);

        AuthProperties.Cookie cookieProps = authProperties.getCookie();
        String cookiePath = cookieProps.getPath() != null ? cookieProps.getPath() : ApiConstants.AUTH;

        ResponseCookie cookie = ResponseCookie
                .from(cookieProps.getName(),
                                response.getRefreshToken() != null ? response.getRefreshToken()
                                                : refreshTokenToUse)
                .httpOnly(true)
                .secure(cookieProps.isSecure())
                .path(cookiePath)
                .maxAge(response.getRefreshExpiresIn() != null ? response.getRefreshExpiresIn() : 86400)
                .sameSite(cookieProps.getSameSite())
                .build();

        response.setRefreshToken(null);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.<AuthResponse>builder()
                                .data(response)
                                .message(MSG_REFRESH_TOKEN_SUCCESS)
                                .build());
    }
}
