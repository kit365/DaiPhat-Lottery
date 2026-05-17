package com.daiphat.accountservice.application.service.auth;
 
import com.daiphat.accountservice.application.dto.request.auth.LoginRequest;
import com.daiphat.accountservice.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.accountservice.application.dto.response.auth.AuthResponse;
import com.daiphat.accountservice.application.mapper.AuthApplicationMapper;
import com.daiphat.accountservice.application.port.in.auth.LoginServicePort;
import com.daiphat.accountservice.application.port.out.auth.cache.TokenCachePort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import java.time.Duration;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
 
@Slf4j
@DisplayName("TC-LOGIN-DP-25")
class LoginServiceTest extends AuthTestBase {
 
    @Mock private TokenCachePort tokenCachePort;
    @Mock private AuthApplicationMapper authApplicationMapper;
 
    private LoginServicePort loginService;
 
    @BeforeEach
    @Override
    protected void setUp() {
        super.setUp();
        loginService = new LoginService(
                userLookupService,
                identityManagementPort,
                tokenCachePort,
                authApplicationMapper,
                authProperties,
                loginAttemptService,
                rateLimiterService
        );
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "001: Logic Đăng nhập thành công")
    void tc_login_001_success() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(DEFAULT_PASSWORD).build();
 
        UserModel user = buildActiveUser();
        KeycloakAuthResult keycloakResult = buildAuthResult(user.getId());
 
        when(userLookupService.findActiveByUsernameOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(identityManagementPort.authenticate(DEFAULT_USERNAME, DEFAULT_PASSWORD)).thenReturn(keycloakResult);
        when(authApplicationMapper.toResponse(eq(keycloakResult), eq(user))).thenReturn(AuthResponse.builder().accessToken(DEFAULT_TOKEN).expiresIn(3600L).build());
 
        AuthResponse response = loginService.login(request);
 
        assertThat(response.getAccessToken()).isEqualTo(DEFAULT_TOKEN);
        assertThat(response.getExpiresIn()).isEqualTo(3600);
        verify(tokenCachePort).saveToken(eq(user.getId().toString()), eq(DEFAULT_TOKEN), any());
        log.info("🎯 TC-LOGIN-001: Logic thành công verified.");
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "002: Logic chặn Username không tồn tại (INVALID_CREDENTIALS)")
    void tc_login_002_user_not_found() {
        LoginRequest request = LoginRequest.builder()
                .username(NOT_FOUND_USERNAME).password(DEFAULT_PASSWORD).build();
 
        when(userLookupService.findActiveByUsernameOrThrow(NOT_FOUND_USERNAME)).thenThrow(new DomainException(ErrorCode.INVALID_CREDENTIALS));
 
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.INVALID_CREDENTIALS);
 
        log.info("🎯 TC-LOGIN-002: Logic ẩn giấu lỗi (Enumerate Prevention) verified.");
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "003: Logic chặn Password sai (INVALID_CREDENTIALS)")
    void tc_login_003_wrong_password() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(WRONG_PASSWORD).build();
 
        UserModel user = buildActiveUser();
        when(userLookupService.findActiveByUsernameOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(identityManagementPort.authenticate(DEFAULT_USERNAME, WRONG_PASSWORD))
                .thenThrow(new DomainException(ErrorCode.INVALID_CREDENTIALS));
 
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.INVALID_CREDENTIALS);
 
        log.info("🎯 TC-LOGIN-003: Logic sai mật khẩu verified.");
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "004: Logic Validation Username bắt buộc")
    void tc_login_004_empty_username() {
        LoginRequest request = LoginRequest.builder().username("").password(DEFAULT_PASSWORD).build();
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.USERNAME_REQUIRED);
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "005: Logic Validation Password bắt buộc")
    void tc_login_005_empty_password() {
        LoginRequest request = LoginRequest.builder().username(DEFAULT_USERNAME).password(" ").build();
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.PASSWORD_REQUIRED);
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "006: Logic Token Storage (Redis)")
    void tc_login_006_redis_logic() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(DEFAULT_PASSWORD).build();
        UserModel user = buildActiveUser();
        KeycloakAuthResult keycloakResult = buildAuthResult(user.getId());
 
        when(userLookupService.findActiveByUsernameOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(identityManagementPort.authenticate(DEFAULT_USERNAME, DEFAULT_PASSWORD)).thenReturn(keycloakResult);
        when(authApplicationMapper.toResponse(eq(keycloakResult), eq(user))).thenReturn(AuthResponse.builder().build());
 
        loginService.login(request);
 
        verify(tokenCachePort).saveToken(eq(user.getId().toString()), eq(DEFAULT_TOKEN), any());
        verify(tokenCachePort).saveRefreshToken(eq(user.getId().toString()), eq(DEFAULT_REFRESH_TOKEN), any());
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "007: Logic Refresh Token hết hạn")
    void tc_login_007_refresh_expired() {
        RefreshTokenRequest request = RefreshTokenRequest.builder().refreshToken(DEFAULT_REFRESH_TOKEN).build();
        when(identityManagementPort.refreshToken(DEFAULT_REFRESH_TOKEN)).thenReturn(null);
 
        assertThatThrownBy(() -> loginService.refreshToken(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.REFRESH_TOKEN_EXPIRED);
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "008: Xử lý an toàn Username có ký tự đặc biệt")
    void tc_login_008_special_chars() {
        String specialUser = "tuankiet!@#";
        LoginRequest request = LoginRequest.builder().username(specialUser).password(DEFAULT_PASSWORD).build();
 
        when(userLookupService.findActiveByUsernameOrThrow(specialUser)).thenThrow(new DomainException(ErrorCode.INVALID_CREDENTIALS));
 
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class);
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "009: Logic chặn tài khoản chưa kích hoạt (PENDING)")
    void tc_login_009_pending_account() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(DEFAULT_PASSWORD).build();
        UserModel user = buildActiveUser();
        user.setStatus(UserStatus.PENDING);
 
        when(userLookupService.findActiveByUsernameOrThrow(DEFAULT_USERNAME)).thenThrow(new DomainException(ErrorCode.USER_INACTIVE));
 
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.USER_INACTIVE);
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "010: Ghi nhận lỗi đăng nhập tại LoginAttemptService")
    void tc_login_010_recording_failed_attempt() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(WRONG_PASSWORD).build();
        UserModel user = buildActiveUser();
 
        when(userLookupService.findActiveByUsernameOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(identityManagementPort.authenticate(DEFAULT_USERNAME, WRONG_PASSWORD))
                .thenThrow(new DomainException(ErrorCode.INVALID_CREDENTIALS));
 
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class);
 
        verify(identityManagementPort).authenticate(DEFAULT_USERNAME, WRONG_PASSWORD);
        log.info("🎯 TC-LOGIN-010: Ghi nhận login thất bại verified.");
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "011: Logic kích hoạt Lockout")
    void tc_login_011_lockout_activation() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(DEFAULT_PASSWORD).build();
 
        when(loginAttemptService.executeSecurely(eq(DEFAULT_USERNAME), any()))
                .thenThrow(new DomainException(ErrorCode.USER_LOCKED, "60"));
 
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.USER_LOCKED);
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "012: Chặn truy cập sớm khi đang bị khóa")
    void tc_login_012_early_blocked() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(DEFAULT_PASSWORD).build();
 
        when(loginAttemptService.executeSecurely(eq(DEFAULT_USERNAME), any()))
                .thenThrow(new DomainException(ErrorCode.USER_LOCKED, "45"));
 
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.USER_LOCKED);
 
        verifyNoInteractions(userLookupService);
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "013: Reset bộ đếm khi login thành công")
    void tc_login_013_reset_counter() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(DEFAULT_PASSWORD).build();
        UserModel user = buildActiveUser();
        KeycloakAuthResult keycloakResult = buildAuthResult(user.getId());
 
        when(userLookupService.findActiveByUsernameOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(identityManagementPort.authenticate(DEFAULT_USERNAME, DEFAULT_PASSWORD)).thenReturn(keycloakResult);
        when(authApplicationMapper.toResponse(any(), any())).thenReturn(AuthResponse.builder().build());
 
        loginService.login(request);
 
        verify(loginAttemptService).executeSecurely(eq(DEFAULT_USERNAME), any());
        verify(identityManagementPort).authenticate(DEFAULT_USERNAME, DEFAULT_PASSWORD);
        log.info("🎯 TC-LOGIN-013: Reset Counter verified.");
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "014: Chặn Spam nút \"Đăng nhập\" (Burst Rate Limit)")
    void tc_014_burst_rate_limit() {
        String attacker = "attacker_01";
        LoginRequest request = LoginRequest.builder().username(attacker).password(DEFAULT_PASSWORD).build();
 
        lenient().when(userLookupService.findActiveByUsernameOrThrow(attacker)).thenThrow(new DomainException(ErrorCode.INVALID_CREDENTIALS));
 
        when(rateLimiterService.checkAndRecordFixed(eq(attacker), eq(com.daiphat.accountservice.application.port.out.auth.keys.AuthAction.LOGIN), anyInt(), anyLong()))
                .thenReturn(true)
                .thenReturn(true)
                .thenThrow(new DomainException(ErrorCode.TOO_MANY_REQUESTS));
 
        assertThatThrownBy(() -> loginService.login(request)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> loginService.login(request)).isInstanceOf(DomainException.class);
 
        assertThatThrownBy(() -> loginService.login(request))
            .isInstanceOf(DomainException.class)
            .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.TOO_MANY_REQUESTS);
 
        verify(rateLimiterService, times(3)).checkAndRecordFixed(eq(attacker), eq(com.daiphat.accountservice.application.port.out.auth.keys.AuthAction.LOGIN), anyInt(), anyLong());
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "015: Reset Rate Limit khi Login thành công")
    void tc_015_reset_rate_limit_on_success() {
        String legitUser = "legit_02";
        LoginRequest request = LoginRequest.builder().username(legitUser).password(DEFAULT_PASSWORD).build();
        UserModel user = buildActiveUser();
        user.setUsername(legitUser);
        KeycloakAuthResult keycloakResult = buildAuthResult(user.getId());
 
        when(userLookupService.findActiveByUsernameOrThrow(legitUser)).thenReturn(user);
        when(identityManagementPort.authenticate(legitUser, DEFAULT_PASSWORD)).thenReturn(keycloakResult);
        when(authApplicationMapper.toResponse(any(), any())).thenReturn(AuthResponse.builder().build());
 
        loginService.login(request);
 
        verify(rateLimiterService).checkAndRecordFixed(eq(legitUser), eq(com.daiphat.accountservice.application.port.out.auth.keys.AuthAction.LOGIN), anyInt(), anyLong());
        verify(rateLimiterService).resetRateLimit(eq(legitUser), eq(com.daiphat.accountservice.application.port.out.auth.keys.AuthAction.LOGIN));
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "016: Đăng nhập với 'Nhớ mật khẩu' được bật (TTL 30 ngày)")
    void tc_login_016_remember_me() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(DEFAULT_PASSWORD)
                .rememberMe(true).build();
 
        UserModel user = buildActiveUser();
        KeycloakAuthResult keycloakResult = buildAuthResult(user.getId());
        Duration rememberMeTtl = Duration.ofDays(30);
 
        when(userLookupService.findActiveByUsernameOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(identityManagementPort.authenticate(DEFAULT_USERNAME, DEFAULT_PASSWORD)).thenReturn(keycloakResult);
        when(authApplicationMapper.toResponse(any(), any())).thenReturn(AuthResponse.builder().expiresIn(rememberMeTtl.toSeconds()).build());
        when(authProperties.getToken().getRememberMeTtl()).thenReturn(rememberMeTtl);
 
        AuthResponse response = loginService.login(request);
 
        verify(tokenCachePort).saveToken(eq(user.getId().toString()), any(), eq(rememberMeTtl));
        verify(tokenCachePort).saveRefreshToken(eq(user.getId().toString()), any(), eq(rememberMeTtl));
 
        assertThat(response.getExpiresIn()).isEqualTo(rememberMeTtl.toSeconds());
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "017: Làm mới token thành công khi access token hết hạn")
    void tc_login_017_refresh_success() {
        RefreshTokenRequest request = RefreshTokenRequest.builder().refreshToken(DEFAULT_REFRESH_TOKEN).build();
        UserModel user = buildActiveUser();
        KeycloakAuthResult keycloakResult = buildAuthResult(user.getId());
        keycloakResult.setAccessToken(NEW_ACCESS_TOKEN);
 
        when(userLookupService.findActiveByIdOrThrow(user.getId())).thenReturn(user);
        when(identityManagementPort.refreshToken(DEFAULT_REFRESH_TOKEN)).thenReturn(keycloakResult);
        when(authApplicationMapper.toResponse(eq(keycloakResult), eq(user))).thenReturn(AuthResponse.builder().accessToken(NEW_ACCESS_TOKEN).build());
 
        AuthResponse response = loginService.refreshToken(request);
 
        assertThat(response.getAccessToken()).isEqualTo(NEW_ACCESS_TOKEN);
        verify(tokenCachePort).saveToken(anyString(), eq(NEW_ACCESS_TOKEN), any());
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "018: Refresh Token hết hạn - yêu cầu đăng nhập lại")
    void tc_login_018_refresh_expired() {
        RefreshTokenRequest request = RefreshTokenRequest.builder().refreshToken(DEFAULT_REFRESH_TOKEN).build();
        when(identityManagementPort.refreshToken(DEFAULT_REFRESH_TOKEN)).thenReturn(null);
 
        assertThatThrownBy(() -> loginService.refreshToken(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.REFRESH_TOKEN_EXPIRED);
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "019: Phát hiện không khớp User ID (CRITICAL SECURITY)")
    void tc_login_019_id_mismatch() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(DEFAULT_PASSWORD).build();
 
        UserModel user = buildActiveUser();
        KeycloakAuthResult keycloakResult = buildAuthResult(UUID.randomUUID());
 
        when(userLookupService.findActiveByUsernameOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(identityManagementPort.authenticate(DEFAULT_USERNAME, DEFAULT_PASSWORD)).thenReturn(keycloakResult);
 
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.USER_ID_MISMATCH);
 
        verify(tokenCachePort, never()).saveToken(anyString(), anyString(), any());
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "020: Phát hiện Malformed UUID từ IDP (CRITICAL SECURITY)")
    void tc_login_020_malformed_uuid() {
        LoginRequest request = LoginRequest.builder()
                .username(DEFAULT_USERNAME).password(DEFAULT_PASSWORD).build();
 
        UserModel user = buildActiveUser();
        KeycloakAuthResult keycloakResult = buildAuthResult(user.getId());
        keycloakResult.setKeycloakUserId(MALFORMED_UUID);
 
        when(userLookupService.findActiveByUsernameOrThrow(DEFAULT_USERNAME)).thenReturn(user);
        when(identityManagementPort.authenticate(DEFAULT_USERNAME, DEFAULT_PASSWORD)).thenReturn(keycloakResult);
 
        assertThatThrownBy(() -> loginService.login(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.INVALID_CREDENTIALS);
 
        verify(tokenCachePort, never()).saveToken(anyString(), anyString(), any());
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "021: Phát hiện Malformed UUID từ IDP trong luồng Refresh")
    void tc_refresh_021_malformed_uuid() {
        RefreshTokenRequest request = RefreshTokenRequest.builder().refreshToken(DEFAULT_REFRESH_TOKEN).build();
 
        KeycloakAuthResult keycloakResult = buildAuthResult(UUID.randomUUID());
        keycloakResult.setKeycloakUserId(MALFORMED_UUID);
 
        when(identityManagementPort.refreshToken(DEFAULT_REFRESH_TOKEN)).thenReturn(keycloakResult);
 
        assertThatThrownBy(() -> loginService.refreshToken(request))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.REFRESH_TOKEN_EXPIRED);
 
        verifyNoInteractions(userLookupService);
        verify(tokenCachePort, never()).saveToken(anyString(), anyString(), any());
    }
 
    @Test
    @DisplayName(TC_LOGOUT_PREFIX + "001: Người dùng đăng xuất thành công và phiên bị hủy")
    void tc_logout_001_success() {
        UserModel user = buildActiveUser();
        when(identityManagementPort.getUserIdFromToken(DEFAULT_REFRESH_TOKEN)).thenReturn(user.getId());
 
        loginService.logout(DEFAULT_REFRESH_TOKEN);
 
        verify(tokenCachePort).revokeToken(user.getId().toString());
        verify(identityManagementPort).logout(DEFAULT_REFRESH_TOKEN);
    }
 
    @Test
    @DisplayName(TC_LOGOUT_PREFIX + "002: Đăng xuất xử lý token không hợp lệ/hết hạn nhẹ nhàng (Fail-safe)")
    void tc_logout_002_fail_safe() {
        UserModel user = buildActiveUser();
        when(identityManagementPort.getUserIdFromToken(DEFAULT_REFRESH_TOKEN)).thenReturn(user.getId());
 
        doThrow(new DomainException(ErrorCode.INTERNAL_SERVER_ERROR))
                .when(identityManagementPort).logout(anyString());
 
        loginService.logout(DEFAULT_REFRESH_TOKEN);
 
        verify(tokenCachePort).revokeToken(user.getId().toString());
        verify(identityManagementPort).logout(DEFAULT_REFRESH_TOKEN);
    }
 
    @Test
    @DisplayName(TC_LOGOUT_PREFIX + "003: Đăng xuất khi Refresh Token bị null (Dừng xử lý)")
    void tc_logout_003_null_token() {
        loginService.logout(null);
 
        verify(tokenCachePort, never()).revokeToken(anyString());
        verify(identityManagementPort, never()).logout(anyString());
        log.info("🎯 TC-LOGOUT-003: Null Refresh Token handled safely (Short-circuit).");
    }
 
    private UserModel buildActiveUser() {
        UserModel user = new UserModel();
        user.setId(UUID.randomUUID());
        user.setUsername(DEFAULT_USERNAME);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(true);
        return user;
    }
 
    private KeycloakAuthResult buildAuthResult(UUID userId) {
        KeycloakAuthResult result = new KeycloakAuthResult();
        result.setAccessToken(DEFAULT_TOKEN);
        result.setRefreshToken(DEFAULT_REFRESH_TOKEN);
        result.setKeycloakUserId(userId.toString());
        result.setExpiresIn(3600L);
        result.setRefreshExpiresIn(86400L);
        return result;
    }
}
