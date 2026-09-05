package com.daiphat.coreapi.adapter.in.web.controller;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.auth.ChangePasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.ForgotPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.GoogleLoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.LoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.LogoutRequest;
import com.daiphat.coreapi.application.dto.request.auth.OtpConfirmationRequest;
import com.daiphat.coreapi.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.coreapi.application.dto.request.auth.ResetPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.VerifyOtpRequest;
import com.daiphat.coreapi.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.coreapi.application.dto.response.auth.AuthResponse;
import com.daiphat.coreapi.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.coreapi.application.dto.response.auth.PasswordPolicyResponse;
import com.daiphat.coreapi.application.dto.response.auth.VerifyOtpResponse;
import com.daiphat.coreapi.application.port.in.auth.AuthServicePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String MSG_LOGIN_SUCCESS = "Đăng nhập thành công.";
    private static final String MSG_GOOGLE_LOGIN_SUCCESS = "Đăng nhập Google thành công.";
    private static final String MSG_REFRESH_TOKEN_SUCCESS = "Làm mới mã định danh thành công.";
    private static final String MSG_LOGOUT_SUCCESS = "Đăng xuất thành công.";
    private static final String MSG_REGISTER_SUCCESS = "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.";
    private static final String MSG_VERIFY_EMAIL_SUCCESS = "Xác thực email thành công.";
    private static final String MSG_RESEND_VERIFY_SUCCESS = "Đã gửi lại email xác thực.";
    private static final String MSG_POLICY_FETCHED = "Lấy chính sách mật khẩu thành công.";
    private static final String MSG_OTP_SENT = "Đã gửi mã OTP.";
    private static final String MSG_OTP_RESENT = "Đã gửi lại mã OTP.";
    private static final String MSG_OTP_VERIFIED = "Xác thực OTP thành công.";
    private static final String MSG_PW_RESET_SUCCESS = "Đặt lại mật khẩu thành công.";
    private static final String MSG_INITIATE_RESET_SUCCESS = "Đã gửi mã OTP đặt lại mật khẩu.";
    private static final String MSG_CONFIRM_RESET_SUCCESS = "Đặt lại mật khẩu thành công. Mật khẩu mới đã được gửi qua email.";
    private static final String MSG_CHANGE_PASSWORD_SUCCESS = "Đổi mật khẩu thành công.";
    private static final String REFRESH_COOKIE_NAME = "${daiphat.auth.cookie.name}";
    private static final String FORGOT_PASSWORD = "/forgot-password";
    private static final String LEGACY_REFRESH_COOKIE_NAME = "refreshToken";
    private static final String ACCESS_COOKIE_NAME = "token";
    private static final String ROOT_PATH = "/";
    /** Former local default; browsers may still hold a stale cookie on this path. */
    private static final String LEGACY_AUTH_COOKIE_PATH = "/api/v1/auth";

    private final AuthServicePort authServicePort;

    @Value(REFRESH_COOKIE_NAME)
    private String refreshCookieName;

    @Value("${daiphat.auth.cookie.secure}")
    private boolean refreshCookieSecure;

    @Value("${daiphat.auth.cookie.same-site}")
    private String refreshCookieSameSite;

    @Value("${daiphat.auth.cookie.path}")
    private String refreshCookiePath;

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse httpResponse
    ) {
        AuthResponse response = authServicePort.login(request);
        clearLegacyAuthCookies(httpResponse);
        writeRefreshCookie(httpResponse, response);
        return ApiResponse.success(MSG_LOGIN_SUCCESS, response);
    }

    @PostMapping("/google")
    public ApiResponse<AuthResponse> loginWithGoogle(
            @RequestBody GoogleLoginRequest request,
            HttpServletResponse httpResponse
    ) {
        AuthResponse response = authServicePort.loginWithGoogle(request);
        clearLegacyAuthCookies(httpResponse);
        writeRefreshCookie(httpResponse, response);
        return ApiResponse.success(MSG_GOOGLE_LOGIN_SUCCESS, response);
    }

    @PostMapping("/register")
    public ApiResponse<Void> register(@Valid @RequestBody UserRegistrationRequest request) {
        authServicePort.register(request);
        return ApiResponse.success(MSG_REGISTER_SUCCESS);
    }

    @GetMapping("/verify-email")
    public ApiResponse<Void> verifyEmail(@RequestParam String token) {
        authServicePort.verifyEmail(token);
        return ApiResponse.success(MSG_VERIFY_EMAIL_SUCCESS);
    }

    @PostMapping("/register/resend-verification")
    public ApiResponse<Void> resendVerification(@RequestParam String email) {
        authServicePort.resendVerificationEmail(email);
        return ApiResponse.success(MSG_RESEND_VERIFY_SUCCESS);
    }

    @GetMapping("/password-policy")
    public ApiResponse<PasswordPolicyResponse> getPasswordPolicy() {
        return ApiResponse.success(MSG_POLICY_FETCHED, authServicePort.getPasswordPolicy());
    }

    @PostMapping(FORGOT_PASSWORD + "/request")
    public ApiResponse<ForgotPasswordResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        ForgotPasswordResponse response = authServicePort.forgotPassword(request);
        return ApiResponse.success(MSG_OTP_SENT, response);
    }

    @PostMapping(FORGOT_PASSWORD + "/resend")
    public ApiResponse<ForgotPasswordResponse> resendOtp(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        ForgotPasswordResponse response = authServicePort.resendForgotPasswordOtp(request);
        return ApiResponse.success(MSG_OTP_RESENT, response);
    }

    @PostMapping(FORGOT_PASSWORD + "/verify")
    public ApiResponse<VerifyOtpResponse> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request
    ) {
        VerifyOtpResponse response = authServicePort.verifyResetOtp(request);
        return ApiResponse.success(MSG_OTP_VERIFIED, response);
    }

    @PostMapping(FORGOT_PASSWORD + "/reset")
    public ApiResponse<Void> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletResponse httpResponse
    ) {
        authServicePort.resetPassword(request);
        clearAllAuthCookies(httpResponse);
        return ApiResponse.success(MSG_PW_RESET_SUCCESS);
    }

    @PostMapping("/{id}/reset-password/initiate")
    @PreAuthorize("hasAnyAuthority('admin:edit', 'member:edit')")
    public ApiResponse<Void> initiateResetPassword(@PathVariable UUID id) {
        authServicePort.initiatePasswordReset(id);
        return ApiResponse.success(MSG_INITIATE_RESET_SUCCESS);
    }

    @PostMapping("/{id}/reset-password/confirm")
    @PreAuthorize("hasAnyAuthority('admin:edit', 'member:edit')")
    public ApiResponse<Void> confirmResetPassword(
            @PathVariable UUID id,
            @Valid @RequestBody OtpConfirmationRequest request) {
        authServicePort.confirmPasswordReset(id, request.otp());
        return ApiResponse.success(MSG_CONFIRM_RESET_SUCCESS);
    }

    @PostMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> changePassword(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletResponse httpResponse) {
        authServicePort.changePassword(principal.getId(), request);
        clearAllAuthCookies(httpResponse);
        return ApiResponse.success(MSG_CHANGE_PASSWORD_SUCCESS);
    }

    @PostMapping("/refresh-token")
    public ApiResponse<AuthResponse> refresh(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        // Prefer every same-name cookie value (Path=/ vs Path=/api/v1/auth duplicates).
        // @CookieValue alone picks one arbitrarily — often the stale rotated token → 401.
        List<String> candidates = extractRefreshTokenCandidates(httpRequest);
        if (candidates.isEmpty()) {
            throw new DomainException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }
        DomainException lastFailure = null;
        for (String refreshToken : candidates) {
            try {
                AuthResponse response = authServicePort.refreshToken(new RefreshTokenRequest(refreshToken));
                writeRefreshCookie(httpResponse, response);
                return ApiResponse.success(MSG_REFRESH_TOKEN_SUCCESS, response);
            } catch (DomainException ex) {
                lastFailure = ex;
            }
        }
        throw lastFailure != null ? lastFailure : new DomainException(ErrorCode.REFRESH_TOKEN_EXPIRED);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        List<String> candidates = extractRefreshTokenCandidates(httpRequest);
        String refreshToken = candidates.isEmpty() ? null : candidates.get(0);
        authServicePort.logout(new LogoutRequest(refreshToken));
        clearAllAuthCookies(httpResponse);
        return ApiResponse.success(MSG_LOGOUT_SUCCESS);
    }

    private List<String> extractRefreshTokenCandidates(HttpServletRequest httpRequest) {
        Set<String> unique = new LinkedHashSet<>();
        Cookie[] cookies = httpRequest.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (refreshCookieName.equals(cookie.getName())) {
                    String value = cookie.getValue();
                    if (value != null && !value.isBlank()) {
                        unique.add(value);
                    }
                }
            }
        }
        return new ArrayList<>(unique);
    }

    private void writeRefreshCookie(HttpServletResponse httpResponse, AuthResponse response) {
        httpResponse.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        httpResponse.setHeader(HttpHeaders.PRAGMA, "no-cache");
        // Expire every known path first so the browser drops stale duplicates.
        clearRefreshCookieOnAllPaths(httpResponse);
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, refreshCookie(response).toString());
    }

    private void clearRefreshCookieOnAllPaths(HttpServletResponse httpResponse) {
        for (String path : refreshCookiePathsToClear()) {
            addExpiredCookie(httpResponse, refreshCookieName, path, true);
        }
    }

    private List<String> refreshCookiePathsToClear() {
        Set<String> paths = new LinkedHashSet<>();
        paths.add(ROOT_PATH);
        paths.add(LEGACY_AUTH_COOKIE_PATH);
        if (refreshCookiePath != null && !refreshCookiePath.isBlank()) {
            paths.add(refreshCookiePath);
        }
        return new ArrayList<>(paths);
    }

    private void clearLegacyAuthCookies(HttpServletResponse httpResponse) {
        addExpiredCookie(httpResponse, LEGACY_REFRESH_COOKIE_NAME, ROOT_PATH, false);
        if (!"refresh_token".equals(refreshCookieName)) {
            for (String path : refreshCookiePathsToClear()) {
                addExpiredCookie(httpResponse, "refresh_token", path, true);
            }
        }
    }

    private void clearAllAuthCookies(HttpServletResponse httpResponse) {
        clearRefreshCookieOnAllPaths(httpResponse);
        clearLegacyAuthCookies(httpResponse);
        addExpiredCookie(httpResponse, ACCESS_COOKIE_NAME, ROOT_PATH, false);
        httpResponse.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        httpResponse.setHeader(HttpHeaders.PRAGMA, "no-cache");
    }

    private void addExpiredCookie(
            HttpServletResponse httpResponse,
            String name,
            String path,
            boolean httpOnly
    ) {
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, expiredCookie(name, path, httpOnly).toString());
    }

    private ResponseCookie refreshCookie(AuthResponse response) {
        return ResponseCookie.from(refreshCookieName, response.getRefreshToken())
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .path(refreshCookiePath)
                .maxAge(response.getRefreshExpiresIn())
                .sameSite(refreshCookieSameSite)
                .build();
    }

    private ResponseCookie expiredCookie(String name, String path, boolean httpOnly) {
        return ResponseCookie.from(name, "")
                .httpOnly(httpOnly)
                .secure(refreshCookieSecure)
                .path(path)
                .maxAge(0)
                .sameSite(refreshCookieSameSite)
                .build();
    }
}
