package com.daiphat.coreapi.infrastructure.security.jwt;

import com.daiphat.coreapi.domain.model.UserModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenServiceTest {

    private JwtTokenService jwtTokenService;
    private UserModel user;

    @BeforeEach
    void setUp() {
        jwtTokenService = new JwtTokenService();
        ReflectionTestUtils.setField(jwtTokenService, "secret",
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        ReflectionTestUtils.setField(jwtTokenService, "issuer", "daiphat-test");
        ReflectionTestUtils.setField(jwtTokenService, "accessTokenTtlSeconds", 900L);
        ReflectionTestUtils.setField(jwtTokenService, "refreshTokenTtlSeconds", 604800L);

        user = UserModel.builder()
                .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .username("member")
                .email("member@daiphat.id.vn")
                .authVersion(7L)
                .build();
    }

    @Test
    void accessTokenBecomesInvalidAfterAllSessionsAreRevoked() {
        String token = jwtTokenService.generateAccessToken(user);
        String refreshToken = jwtTokenService.generateRefreshToken(user);

        assertThat(jwtTokenService.isAccessTokenValidForUser(token, user)).isTrue();
        assertThat(jwtTokenService.isRefreshTokenValidForUser(refreshToken, user)).isTrue();

        user.revokeAllSessions();

        assertThat(jwtTokenService.isAccessTokenValidForUser(token, user)).isFalse();
        assertThat(jwtTokenService.isRefreshTokenValidForUser(refreshToken, user)).isFalse();
    }
}
