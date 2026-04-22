package com.daiphat.accountservice.application.service.auth;
 
import com.daiphat.accountservice.application.dto.request.auth.LoginRequest;
import com.daiphat.accountservice.application.dto.request.auth.LogoutRequest;
import com.daiphat.accountservice.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.accountservice.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.accountservice.application.dto.response.auth.AuthResponse;
import com.daiphat.accountservice.application.dto.response.auth.PasswordPolicyResponse;
import com.daiphat.accountservice.application.dto.response.auth.PasswordRequirementResponse;
import com.daiphat.accountservice.application.port.in.auth.LoginServicePort;
import com.daiphat.accountservice.application.port.in.auth.OAuthProvisioningPort;
import com.daiphat.accountservice.application.port.in.auth.PasswordResetServicePort;
import com.daiphat.accountservice.application.port.in.auth.RegistrationServicePort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
 
@Slf4j
class AuthServiceTest extends AuthTestBase {
 
    @Mock private LoginServicePort loginService;
    @Mock private RegistrationServicePort registrationService;
    @Mock private PasswordResetServicePort passwordResetService;
    @Mock private OAuthProvisioningPort oAuthProvisioningPort;
 
    @InjectMocks
    private AuthService authService;
 
    @BeforeEach
    @Override
    protected void setUp() {
        super.setUp();
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "001: Đăng nhập thành công với thông tin hợp lệ")
    void should_delegate_login_to_logic_service() {
        LoginRequest request = LoginRequest.builder().username(DEFAULT_USERNAME).build();
        AuthResponse mockResponse = AuthResponse.builder().accessToken(DEFAULT_TOKEN).build();
 
        when(loginService.login(any())).thenReturn(mockResponse);
 
        AuthResponse response = authService.login(request);
 
        assertThat(response.getAccessToken()).isEqualTo(DEFAULT_TOKEN);
        verify(loginService).login(request);
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "007: Token Redis hết hạn")
    void should_delegate_refresh_token_to_logic_service() {
        RefreshTokenRequest request = RefreshTokenRequest.builder().refreshToken(DEFAULT_REFRESH_TOKEN).build();
        AuthResponse mockResponse = AuthResponse.builder().accessToken(DEFAULT_TOKEN).build();
 
        when(loginService.refreshToken(any())).thenReturn(mockResponse);
 
        AuthResponse response = authService.refreshToken(request);
 
        assertThat(response.getAccessToken()).isEqualTo(DEFAULT_TOKEN);
        verify(loginService).refreshToken(request);
    }
 
    @Test
    @DisplayName(TC_LOGOUT_PREFIX + "001: Xử lý logout thành công qua logic service")
    void should_delegate_logout_to_logic_service() {
        LogoutRequest request = LogoutRequest.builder()
                .refreshToken(DEFAULT_REFRESH_TOKEN)
                .build();

        authService.logout(request);

        verify(loginService).logout(DEFAULT_REFRESH_TOKEN);
    }
 
    @Test
    @DisplayName(TC_LOGIN_PREFIX + "999: Lỗi Domain Error từ Logic Service")
    void should_handle_domain_exception_from_logic_service() {
        when(loginService.login(any())).thenThrow(new DomainException(ErrorCode.INVALID_CREDENTIALS));
 
        assertThatThrownBy(() -> authService.login(LoginRequest.builder().build()))
                .isInstanceOf(DomainException.class)
                .matches(e -> ((DomainException) e).getErrorCode() == ErrorCode.INVALID_CREDENTIALS);
    }
 
    @Test
    @DisplayName(TC_REG_PREFIX + "001: Ủy quyền đăng ký sang RegistrationService")
    void should_delegate_register_to_registration_service() {
        UserRegistrationRequest request = UserRegistrationRequest.builder().username(DEFAULT_USERNAME).build();
 
        authService.register(request);
 
        verify(registrationService).register(request);
    }
 
    @Test
    @DisplayName(TC_REG_PREFIX + "013: Ủy quyền xác thực email sang RegistrationService")
    void should_delegate_verify_email_to_registration_service() {
        String token = "valid-token";
 
        authService.verifyEmail(token);
 
        verify(registrationService).verifyEmail(token);
    }
 
    @Test
    @DisplayName(TC_REG_PREFIX + "020: Ủy quyền gửi lại mail xác thực sang RegistrationService")
    void should_delegate_resend_verification_to_registration_service() {
        authService.resendVerificationEmail(DEFAULT_EMAIL);
 
        verify(registrationService).resendVerificationEmail(DEFAULT_EMAIL);
    }
 
    @Test
    @DisplayName("Ủy quyền lấy Password Policy sang AuthService logic")
    void should_return_password_policy() {
        PasswordPolicyResponse mockPolicy = PasswordPolicyResponse.builder()
                .minLength(8)
                .requirements(List.of(
                    new PasswordRequirementResponse("min_length", "Ít nhất 8 ký tự", null)
                ))
                .build();
        when(passwordResetService.getPasswordPolicy()).thenReturn(mockPolicy);

        var response = authService.getPasswordPolicy();
 
        assertThat(response).isNotNull();
        assertThat(response.getRequirements()).isNotEmpty();
        assertThat(response.getMinLength()).isEqualTo(8);
    }
}
