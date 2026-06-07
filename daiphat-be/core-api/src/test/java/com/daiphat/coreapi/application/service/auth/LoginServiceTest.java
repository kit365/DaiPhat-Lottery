package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.auth.GoogleLoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.LoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.coreapi.application.dto.response.auth.AuthResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.out.file.RemoteFilePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.AuthToken;
import com.daiphat.coreapi.domain.model.auth.OAuthUserInfo;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.application.port.in.auth.LoginServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Core LoginService - Test Suite")
class LoginServiceTest extends AuthTestBase {

    private LoginServicePort loginService;

    @BeforeEach
    void setUp() {
        loginService = new LoginService(
                userLookupService,
                userRepositoryPort,
                roleService,
                googleOAuthPort,
                passwordHashPort,
                storagePort,
                remoteFilePort,
                tokenProviderPort,
                refreshTokenStorePort,
                authApplicationMapper
        );
    }


    @Test
    @DisplayName("TC-LOGIN-001: Đăng nhập thành công với thông tin hợp lệ")
    void login_success_issuesTokensAndStoresRefreshToken() {
        UserModel user = activeUser();
        AuthResponse mapped = AuthResponse.builder().accessToken(ACCESS_TOKEN).refreshToken(REFRESH_TOKEN).build();

        when(userLookupService.findByUsernameOrEmailOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(passwordHashPort.matches(DEFAULT_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
        when(tokenProviderPort.generateAccessToken(user)).thenReturn(ACCESS_TOKEN);
        when(tokenProviderPort.generateRefreshToken(user)).thenReturn(REFRESH_TOKEN);
        when(tokenProviderPort.getAccessTokenTtlSeconds()).thenReturn(3600L);
        when(tokenProviderPort.getRefreshTokenTtlSeconds()).thenReturn(604800L);
        when(authApplicationMapper.toResponse(any(AuthToken.class))).thenReturn(mapped);

        AuthResponse response = loginService.login(new LoginRequest(DEFAULT_USERNAME, DEFAULT_PASSWORD));

        assertThat(response).isSameAs(mapped);
        verify(refreshTokenStorePort).save(DEFAULT_USER_ID, REFRESH_TOKEN, Duration.ofSeconds(604800));
    }

    @Test
    @DisplayName("TC-LOGIN-002: Chặn Username không tồn tại (INVALID_CREDENTIALS)")
    void login_userNotFound_hidesReasonAsInvalidCredentials() {
        when(userLookupService.findByUsernameOrEmailOrThrow(DEFAULT_USERNAME))
                .thenThrow(new DomainException(ErrorCode.USER_NOT_FOUND));

        assertThatThrownBy(() -> loginService.login(new LoginRequest(DEFAULT_USERNAME, DEFAULT_PASSWORD)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);

        verify(passwordHashPort, never()).matches(any(), any());
    }

    @Test
    @DisplayName("TC-LOGIN-003: Chặn Password sai (INVALID_CREDENTIALS)")
    void login_wrongPassword_throwsInvalidCredentials() {
        UserModel user = activeUser();
        when(userLookupService.findByUsernameOrEmailOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(passwordHashPort.matches("wrong", ENCODED_PASSWORD)).thenReturn(false);

        assertThatThrownBy(() -> loginService.login(new LoginRequest(DEFAULT_USERNAME, "wrong")))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    @Test
    @DisplayName("TC-LOGIN-008: Xử lý an toàn Username có ký tự đặc biệt")
    void login_specialChars_hidesReasonAsInvalidCredentials() {
        String specialUser = "tuankiet!@#";
        when(userLookupService.findByUsernameOrEmailOrThrow(specialUser))
                .thenThrow(new DomainException(ErrorCode.USER_NOT_FOUND));

        assertThatThrownBy(() -> loginService.login(new LoginRequest(specialUser, DEFAULT_PASSWORD)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    @Test
    @DisplayName("TC-LOGIN-009: Chặn tài khoản chưa kích hoạt và chưa xác thực email (PENDING)")
    void login_pendingAccount_throwsUserInactive() {
        UserModel user = activeUser();
        user.setStatus(UserStatus.PENDING);
        user.setEmailVerified(false);

        when(userLookupService.findByUsernameOrEmailOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(passwordHashPort.matches(DEFAULT_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);

        assertThatThrownBy(() -> loginService.login(new LoginRequest(DEFAULT_USERNAME, DEFAULT_PASSWORD)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.USER_INACTIVE);
    }

    @Test
    @DisplayName("TC-LOGIN-017: Làm mới token thành công khi refresh token hợp lệ")
    void refreshToken_success_rotatesRefreshToken() {
        UserModel user = activeUser();
        AuthResponse mapped = AuthResponse.builder().accessToken(ACCESS_TOKEN).refreshToken(NEW_REFRESH_TOKEN).build();

        when(tokenProviderPort.extractUsernameFromRefreshToken(REFRESH_TOKEN)).thenReturn(DEFAULT_USERNAME);
        when(userLookupService.findByUsername(DEFAULT_USERNAME)).thenReturn(Optional.of(user));
        when(refreshTokenStorePort.find(DEFAULT_USER_ID)).thenReturn(Optional.of(REFRESH_TOKEN));
        when(tokenProviderPort.generateAccessToken(user)).thenReturn(ACCESS_TOKEN);
        when(tokenProviderPort.generateRefreshToken(user)).thenReturn(NEW_REFRESH_TOKEN);
        when(tokenProviderPort.getAccessTokenTtlSeconds()).thenReturn(3600L);
        when(tokenProviderPort.getRefreshTokenTtlSeconds()).thenReturn(604800L);
        when(authApplicationMapper.toResponse(any(AuthToken.class))).thenReturn(mapped);

        AuthResponse response = loginService.refreshToken(new RefreshTokenRequest(REFRESH_TOKEN));

        assertThat(response).isSameAs(mapped);
        verify(refreshTokenStorePort).save(DEFAULT_USER_ID, NEW_REFRESH_TOKEN, Duration.ofSeconds(604800));
    }

    @Test
    @DisplayName("TC-LOGIN-018: Refresh Token hết hạn hoặc không khớp")
    void refreshToken_mismatch_throwsExpired() {
        UserModel user = activeUser();
        when(tokenProviderPort.extractUsernameFromRefreshToken(REFRESH_TOKEN)).thenReturn(DEFAULT_USERNAME);
        when(userLookupService.findByUsername(DEFAULT_USERNAME)).thenReturn(Optional.of(user));
        when(refreshTokenStorePort.find(DEFAULT_USER_ID)).thenReturn(Optional.of("other-token"));

        assertThatThrownBy(() -> loginService.refreshToken(new RefreshTokenRequest(REFRESH_TOKEN)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REFRESH_TOKEN_EXPIRED);
    }

    @Test
    @DisplayName("TC-LOGOUT-001: Đăng xuất thành công và hủy token")
    void logout_validRefreshToken_deletesStoredToken() {
        UserModel user = activeUser();
        when(tokenProviderPort.extractUsernameFromRefreshToken(REFRESH_TOKEN)).thenReturn(DEFAULT_USERNAME);
        when(userLookupService.findByUsername(DEFAULT_USERNAME)).thenReturn(Optional.of(user));

        loginService.logout(REFRESH_TOKEN);

        verify(refreshTokenStorePort).delete(DEFAULT_USER_ID);
    }

    @Test
    @DisplayName("TC-LOGOUT-002: Đăng xuất xử lý ngoại lệ nhẹ nhàng (Fail-safe)")
    void logout_exceptionInExtract_ignored() {
        when(tokenProviderPort.extractUsernameFromRefreshToken(REFRESH_TOKEN))
                .thenThrow(new RuntimeException("JWT Malformed"));

        // Không ném exception ra ngoài, xử lý an toàn
        loginService.logout(REFRESH_TOKEN);

        verify(refreshTokenStorePort, never()).delete(any());
    }

    @Test
    @DisplayName("TC-LOGOUT-003: Đăng xuất khi refresh token bị null/trống (Bỏ qua)")
    void logout_nullOrEmptyToken_doesNothing() {
        loginService.logout(null);
        loginService.logout("");

        verifyNoInteractions(tokenProviderPort);
        verifyNoInteractions(refreshTokenStorePort);
    }

    @Test
    @DisplayName("GOOGLE-LOGIN: Đăng nhập Google và tự tạo tài khoản mới nếu chưa tồn tại")
    void loginWithGoogle_newUser_uploadsAvatarAndStoresRefreshToken() {
        GoogleLoginRequest request = new GoogleLoginRequest("code", null, null, "http://localhost/callback", null);
        OAuthUserInfo googleUser = new OAuthUserInfo(
                UUID.randomUUID(),
                "google-user",
                "google@daiphat.com",
                "Google",
                "User",
                "https://example.test/avatar.png",
                "google"
        );
        UserModel savedUser = activeUser();
        savedUser.setUsername(googleUser.email());
        savedUser.setEmail(googleUser.email());
        savedUser.setImagePublicId("profiles/google");
        savedUser.setImageUrl("https://cdn.test/google.png");

        when(googleOAuthPort.verify(request)).thenReturn(googleUser);
        when(userRepositoryPort.findByEmail(googleUser.email())).thenReturn(Optional.empty());
        when(roleService.getDefaultRole()).thenReturn(defaultRole());
        when(remoteFilePort.download(googleUser.avatarUrl()))
                .thenReturn(new RemoteFilePort.RemoteFile("image".getBytes(), "avatar.png", "image/png"));
        when(storagePort.upload(any())).thenReturn(new StorageResult("profiles/google", "https://cdn.test/google.png"));
        when(userRepositoryPort.save(any(UserModel.class))).thenReturn(savedUser);
        when(tokenProviderPort.generateAccessToken(savedUser)).thenReturn(ACCESS_TOKEN);
        when(tokenProviderPort.generateRefreshToken(savedUser)).thenReturn(REFRESH_TOKEN);
        when(tokenProviderPort.getAccessTokenTtlSeconds()).thenReturn(3600L);
        when(tokenProviderPort.getRefreshTokenTtlSeconds()).thenReturn(604800L);
        when(authApplicationMapper.toResponse(any(AuthToken.class))).thenReturn(AuthResponse.builder().accessToken(ACCESS_TOKEN).build());

        loginService.loginWithGoogle(request);

        ArgumentCaptor<UserModel> userCaptor = ArgumentCaptor.forClass(UserModel.class);
        verify(userRepositoryPort).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getEmail()).isEqualTo(googleUser.email());
        assertThat(userCaptor.getValue().isEmailVerified()).isTrue();
        assertThat(userCaptor.getValue().getImagePublicId()).isEqualTo("profiles/google");
        verify(refreshTokenStorePort).save(DEFAULT_USER_ID, REFRESH_TOKEN, Duration.ofSeconds(604800));
    }

    @Test
    @DisplayName("TC-LOGIN-017-ALT: Refresh Token is null or blank")
    void refreshToken_nullOrBlank_throwsUnauthorized() {
        assertThatThrownBy(() -> loginService.refreshToken(new RefreshTokenRequest(null)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.UNAUTHORIZED);

        assertThatThrownBy(() -> loginService.refreshToken(new RefreshTokenRequest("   ")))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    @DisplayName("TC-LOGIN-017-ALT: Refresh Token parsing fails")
    void refreshToken_parsingFails_throwsExpired() {
        when(tokenProviderPort.extractUsernameFromRefreshToken(REFRESH_TOKEN)).thenThrow(new RuntimeException("invalid token"));

        assertThatThrownBy(() -> loginService.refreshToken(new RefreshTokenRequest(REFRESH_TOKEN)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REFRESH_TOKEN_EXPIRED);
    }

    @Test
    @DisplayName("TC-LOGIN-017-ALT: Refresh Token user not found")
    void refreshToken_userNotFound_throwsInvalidCredentials() {
        when(tokenProviderPort.extractUsernameFromRefreshToken(REFRESH_TOKEN)).thenReturn(DEFAULT_USERNAME);
        when(userLookupService.findByUsername(DEFAULT_USERNAME)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> loginService.refreshToken(new RefreshTokenRequest(REFRESH_TOKEN)))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    @Test
    @DisplayName("GOOGLE-LOGIN: Đồng bộ tài khoản Google khi đã tồn tại")
    void loginWithGoogle_existingUser_synchronizesAndIssuesTokens() {
        GoogleLoginRequest request = new GoogleLoginRequest("code", null, null, "http://localhost/callback", null);
        OAuthUserInfo googleUser = new OAuthUserInfo(
                UUID.randomUUID(),
                "google-user",
                "existing@daiphat.com",
                "NewFirst",
                "NewLast",
                "https://example.test/avatar.png",
                "google"
        );
        UserModel existingUser = activeUser();
        existingUser.setEmail("existing@daiphat.com");
        existingUser.setFirstName("");
        existingUser.setLastName(null);
        existingUser.setEmailVerified(false);
        existingUser.setStatus(UserStatus.PENDING);
        existingUser.setImagePublicId("");

        when(googleOAuthPort.verify(request)).thenReturn(googleUser);
        when(userRepositoryPort.findByEmail(googleUser.email())).thenReturn(Optional.of(existingUser));
        when(remoteFilePort.download(googleUser.avatarUrl()))
                .thenReturn(new RemoteFilePort.RemoteFile("image".getBytes(), "avatar.png", "image/png"));
        when(storagePort.upload(any())).thenReturn(new StorageResult("profiles/google2", "https://cdn.test/google2.png"));
        when(userRepositoryPort.save(any(UserModel.class))).thenReturn(existingUser);
        
        when(tokenProviderPort.generateAccessToken(existingUser)).thenReturn(ACCESS_TOKEN);
        when(tokenProviderPort.generateRefreshToken(existingUser)).thenReturn(REFRESH_TOKEN);
        when(tokenProviderPort.getAccessTokenTtlSeconds()).thenReturn(3600L);
        when(tokenProviderPort.getRefreshTokenTtlSeconds()).thenReturn(604800L);
        when(authApplicationMapper.toResponse(any(AuthToken.class))).thenReturn(AuthResponse.builder().accessToken(ACCESS_TOKEN).build());

        loginService.loginWithGoogle(request);

        verify(userRepositoryPort).save(existingUser);
        assertThat(existingUser.getFirstName()).isEqualTo("NewFirst");
        assertThat(existingUser.getLastName()).isEqualTo("NewLast");
        assertThat(existingUser.isEmailVerified()).isTrue();
        assertThat(existingUser.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(existingUser.getImagePublicId()).isEqualTo("profiles/google2");
    }

    @Test
    @DisplayName("GOOGLE-LOGIN: Upload avatar thất bại không làm lỗi quá trình login")
    void loginWithGoogle_uploadAvatarFails_ignoresException() {
        GoogleLoginRequest request = new GoogleLoginRequest("code", null, null, "http://localhost/callback", null);
        OAuthUserInfo googleUser = new OAuthUserInfo(
                UUID.randomUUID(),
                "google-user",
                "fail@daiphat.com",
                "First",
                "Last",
                "https://example.test/fail.png",
                "google"
        );
        UserModel user = activeUser();
        user.setImagePublicId(null);

        when(googleOAuthPort.verify(request)).thenReturn(googleUser);
        when(userRepositoryPort.findByEmail(googleUser.email())).thenReturn(Optional.of(user));
        when(remoteFilePort.download(googleUser.avatarUrl())).thenThrow(new RuntimeException("Download failed"));
        when(userRepositoryPort.save(any(UserModel.class))).thenReturn(user);
        when(tokenProviderPort.generateAccessToken(user)).thenReturn(ACCESS_TOKEN);
        when(tokenProviderPort.generateRefreshToken(user)).thenReturn(REFRESH_TOKEN);
        when(tokenProviderPort.getAccessTokenTtlSeconds()).thenReturn(3600L);
        when(tokenProviderPort.getRefreshTokenTtlSeconds()).thenReturn(604800L);
        when(authApplicationMapper.toResponse(any(AuthToken.class))).thenReturn(AuthResponse.builder().accessToken(ACCESS_TOKEN).build());

        // Should not throw
        loginService.loginWithGoogle(request);
    }

    /* =========================================================================
     * COMMENTED OUT TESTS: Các tính năng cũ chưa có hoặc đã thay đổi trong Monolith
     * (Giữ lại làm tài liệu tham khảo cho tương lai)
     * ========================================================================= */

    /*
    @Test
    @DisplayName("TC-LOGIN-004: Validation Username bắt buộc (Controller Layer chịu trách nhiệm chính qua @NotBlank)")
    void tc_login_004_empty_username() {
        LoginRequest request = new LoginRequest("", DEFAULT_PASSWORD);
        // Monolith không ném USERNAME_REQUIRED từ Service nữa
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.USERNAME_REQUIRED);
    }

    @Test
    @DisplayName("TC-LOGIN-005: Validation Password bắt buộc (Controller Layer chịu trách nhiệm chính qua @NotBlank)")
    void tc_login_005_empty_password() {
        LoginRequest request = new LoginRequest(DEFAULT_USERNAME, " ");
        // Monolith không ném PASSWORD_REQUIRED từ Service nữa
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.PASSWORD_REQUIRED);
    }

    @Test
    @DisplayName("TC-LOGIN-010: Ghi nhận lỗi đăng nhập tại LoginAttemptService (Monolith hiện chưa có Port LoginAttempt)")
    void tc_login_010_recording_failed_attempt() {
        LoginRequest request = new LoginRequest(DEFAULT_USERNAME, WRONG_PASSWORD);
        UserModel user = activeUser();

        when(userLookupService.findByUsernameOrEmailOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(passwordHashPort.matches(WRONG_PASSWORD, ENCODED_PASSWORD)).thenReturn(false);

        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class);

        verify(loginAttemptService).recordFailedAttempt(DEFAULT_USERNAME);
    }

    @Test
    @DisplayName("TC-LOGIN-011: Logic kích hoạt Lockout (Monolith hiện chưa có Port LoginAttempt)")
    void tc_login_011_lockout_activation() {
        LoginRequest request = new LoginRequest(DEFAULT_USERNAME, DEFAULT_PASSWORD);

        when(loginAttemptService.executeSecurely(eq(DEFAULT_USERNAME), any()))
                .thenThrow(new DomainException(ErrorCode.USER_LOCKED, "60"));

        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.USER_LOCKED);
    }

    @Test
    @DisplayName("TC-LOGIN-012: Chặn truy cập sớm khi đang bị khóa (Monolith hiện chưa có Port LoginAttempt)")
    void tc_login_012_early_blocked() {
        LoginRequest request = new LoginRequest(DEFAULT_USERNAME, DEFAULT_PASSWORD);

        when(loginAttemptService.executeSecurely(eq(DEFAULT_USERNAME), any()))
                .thenThrow(new DomainException(ErrorCode.USER_LOCKED, "45"));

        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.USER_LOCKED);

        verifyNoInteractions(userLookupService);
    }

    @Test
    @DisplayName("TC-LOGIN-013: Reset bộ đếm khi login thành công (Monolith hiện chưa có Port LoginAttempt)")
    void tc_login_013_reset_counter() {
        LoginRequest request = new LoginRequest(DEFAULT_USERNAME, DEFAULT_PASSWORD);
        UserModel user = activeUser();

        when(userLookupService.findByUsernameOrEmailOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(passwordHashPort.matches(DEFAULT_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);

        loginService.login(request);

        verify(loginAttemptService).resetAttempts(DEFAULT_USERNAME);
    }

    @Test
    @DisplayName("TC-LOGIN-014: Chặn Spam nút Login qua Burst Rate Limit (Monolith hiện chưa có Rate Limiter)")
    void tc_014_burst_rate_limit() {
        String attacker = "attacker_01";
        LoginRequest request = new LoginRequest(attacker, DEFAULT_PASSWORD);

        when(rateLimiterService.checkAndRecordFixed(eq(attacker), any(), anyInt(), anyLong()))
                .thenReturn(true)
                .thenReturn(true)
                .thenThrow(new DomainException(ErrorCode.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> loginService.login(request)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> loginService.login(request)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> loginService.login(request))
            .isInstanceOf(DomainException.class)
            .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.TOO_MANY_REQUESTS);
    }

    @Test
    @DisplayName("TC-LOGIN-015: Reset Rate Limit khi Login thành công (Monolith hiện chưa có Rate Limiter)")
    void tc_015_reset_rate_limit_on_success() {
        String legitUser = "legit_02";
        LoginRequest request = new LoginRequest(legitUser, DEFAULT_PASSWORD);
        UserModel user = activeUser();
        user.setUsername(legitUser);

        when(userLookupService.findByUsernameOrEmailOrThrow(legitUser)).thenReturn(user);
        when(passwordHashPort.matches(DEFAULT_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);

        loginService.login(request);

        verify(rateLimiterService).resetRateLimit(legitUser, AuthAction.LOGIN);
    }

    @Test
    @DisplayName("TC-LOGIN-016: Đăng nhập với 'Remember Me' (Monolith hiện chưa hỗ trợ Remember Me ở request payload)")
    void tc_login_016_remember_me() {
        LoginRequest request = new LoginRequest(DEFAULT_USERNAME, DEFAULT_PASSWORD, true); // rememberMe field
        UserModel user = activeUser();
        Duration rememberMeTtl = Duration.ofDays(30);

        when(userLookupService.findByUsernameOrEmailOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(authProperties.getToken().getRememberMeTtl()).thenReturn(rememberMeTtl);

        AuthResponse response = loginService.login(request);

        verify(refreshTokenStorePort).save(eq(user.getId()), anyString(), eq(rememberMeTtl));
    }

    @Test
    @DisplayName("TC-LOGIN-019: Phát hiện không khớp User ID từ IDP (Monolith không dùng Keycloak / IDP)")
    void tc_login_019_id_mismatch() {
        // Monolith lưu thông tin tài khoản hoàn toàn local, không đối chiếu ID với IDP bên ngoài
    }

    @Test
    @DisplayName("TC-LOGIN-020: Phát hiện Malformed UUID từ IDP (Monolith không dùng Keycloak / IDP)")
    void tc_login_020_malformed_uuid() {
        // Monolith không có logic parse UUID trả về từ IDP bên ngoài
    }
    */
}
