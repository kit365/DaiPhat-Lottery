package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.auth.GoogleLoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.LoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.coreapi.application.dto.response.auth.AuthResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.port.out.RemoteFilePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.AuthToken;
import com.daiphat.coreapi.domain.model.auth.OAuthUserInfo;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Core LoginService")
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
    void logout_validRefreshToken_deletesStoredToken() {
        UserModel user = activeUser();
        when(tokenProviderPort.extractUsernameFromRefreshToken(REFRESH_TOKEN)).thenReturn(DEFAULT_USERNAME);
        when(userLookupService.findByUsername(DEFAULT_USERNAME)).thenReturn(Optional.of(user));

        loginService.logout(REFRESH_TOKEN);

        verify(refreshTokenStorePort).delete(DEFAULT_USER_ID);
    }

    @Test
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
}
