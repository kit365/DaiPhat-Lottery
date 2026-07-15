package com.daiphat.coreapi.adapter.in.web.controller;

import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.auth.ChangePasswordRequest;
import com.daiphat.coreapi.application.port.in.auth.AuthServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuthControllerCookieTest {

    @Mock
    private AuthServicePort authServicePort;

    private AuthController controller;

    @BeforeEach
    void setUp() {
        controller = new AuthController(authServicePort);
        ReflectionTestUtils.setField(controller, "refreshCookieName", "__Secure-refresh_token");
        ReflectionTestUtils.setField(controller, "refreshCookieSecure", true);
        ReflectionTestUtils.setField(controller, "refreshCookieSameSite", "Lax");
        ReflectionTestUtils.setField(controller, "refreshCookiePath", "/api/v1/auth");
    }

    @Test
    void changePasswordRevokesBrowserCookies() {
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(userId, "member");
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("Password1")
                .newPassword("Newpass1")
                .confirmPassword("Newpass1")
                .build();
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.changePassword(principal, request, response);

        verify(authServicePort).changePassword(userId, request);
        List<String> cookies = response.getHeaders("Set-Cookie");
        assertThat(cookies).anyMatch(value -> value.startsWith("__Secure-refresh_token=")
                && value.contains("Max-Age=0")
                && value.contains("Path=/api/v1/auth")
                && value.contains("Secure")
                && value.contains("HttpOnly"));
        assertThat(cookies).anyMatch(value -> value.startsWith("token=")
                && value.contains("Max-Age=0")
                && value.contains("Path=/"));
        assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
    }
}
