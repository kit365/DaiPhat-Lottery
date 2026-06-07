package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.auth.GoogleLoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.LoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.coreapi.application.dto.response.auth.AuthResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.event.UserWelcomeEvent;
import com.daiphat.coreapi.application.mapper.AuthApplicationMapper;
import com.daiphat.coreapi.application.port.in.auth.LoginServicePort;
import com.daiphat.coreapi.application.port.in.auth.RoleServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.auth.PasswordHashPort;
import com.daiphat.coreapi.application.port.out.file.RemoteFilePort;
import com.daiphat.coreapi.application.port.out.auth.RefreshTokenStorePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.auth.TokenProviderPort;
import com.daiphat.coreapi.application.port.out.auth.GoogleOAuthPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.AuthToken;
import com.daiphat.coreapi.domain.model.auth.OAuthUserInfo;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoginService implements LoginServicePort {

    private final UserLookupServicePort userLookupService;
    private final UserRepositoryPort userRepositoryPort;
    private final RoleServicePort roleService;
    private final GoogleOAuthPort googleOAuthPort;
    private final PasswordHashPort passwordHashPort;
    private final StoragePort storagePort;
    private final RemoteFilePort remoteFilePort;
    private final TokenProviderPort tokenProviderPort;
    private final RefreshTokenStorePort refreshTokenStorePort;
    private final AuthApplicationMapper authApplicationMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        UserModel user;
        try {
            user = userLookupService.findByUsernameOrEmailOrThrow(request.username().trim());
        } catch (DomainException e) {
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (!passwordHashPort.matches(request.password(), user.getPassword())) {
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
        }

        user.validateLoginEligibility();

        return issueTokensAndStoreRefreshToken(user);
    }

    @Override
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        OAuthUserInfo googleUser = googleOAuthPort.verify(request);

        GoogleLoginResult loginResult = userRepositoryPort.findByEmail(googleUser.email())
                .map(existing -> synchronizeGoogleUser(existing, googleUser))
                .orElseGet(() -> provisionGoogleUser(googleUser));

        UserModel user = loginResult.user();

        user.validateLoginEligibility();
        if (loginResult.shouldSendWelcome()) {
            publishWelcomeEvent(user);
        }
        return issueTokensAndStoreRefreshToken(user);
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        if (request.refreshToken() == null || request.refreshToken().isBlank()) {
            throw new DomainException(ErrorCode.UNAUTHORIZED);
        }

        String username;
        try {
            username = tokenProviderPort.extractUsernameFromRefreshToken(request.refreshToken());
        } catch (RuntimeException ex) {
            throw new DomainException(ErrorCode.REFRESH_TOKEN_EXPIRED, ex);
        }

        UserModel user = userLookupService.findByUsername(username)
                .orElseThrow(() -> new DomainException(ErrorCode.INVALID_CREDENTIALS));

        String storedRefreshToken = refreshTokenStorePort.find(user.getId())
                .orElseThrow(() -> new DomainException(ErrorCode.REFRESH_TOKEN_EXPIRED));

        if (!storedRefreshToken.equals(request.refreshToken())) {
            throw new DomainException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }

        user.validateLoginEligibility();

        return issueTokensAndStoreRefreshToken(user);
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }

        try {
            String username = tokenProviderPort.extractUsernameFromRefreshToken(refreshToken);
            userLookupService.findByUsername(username)
                    .ifPresent(user -> refreshTokenStorePort.delete(user.getId()));
        } catch (RuntimeException ignored) {

        }
    }

    private AuthResponse issueTokensAndStoreRefreshToken(UserModel user) {
        AuthToken token = new AuthToken(
                tokenProviderPort.generateAccessToken(user),
                tokenProviderPort.generateRefreshToken(user),
                tokenProviderPort.getAccessTokenTtlSeconds(),
                tokenProviderPort.getRefreshTokenTtlSeconds(),
                "Bearer"
        );
        refreshTokenStorePort.save(user.getId(), token.refreshToken(), Duration.ofSeconds(token.refreshExpiresIn()));
        return authApplicationMapper.toResponse(token);
    }

    private GoogleLoginResult provisionGoogleUser(OAuthUserInfo googleUser) {
        UserModel user = UserModel.builder()
                .username(googleUser.email())
                .email(googleUser.email())
                .firstName(defaultIfBlank(googleUser.firstName(), "Google"))
                .lastName(defaultIfBlank(googleUser.lastName(), "User"))
                .build();
        user.onboardOAuthUser(roleService.getDefaultRole());
        addAvatarIfPresent(user, googleUser.avatarUrl());
        return new GoogleLoginResult(userRepositoryPort.save(user), true);
    }

    private GoogleLoginResult synchronizeGoogleUser(UserModel user, OAuthUserInfo googleUser) {
        boolean shouldSendWelcome = false;

        if (isBlank(user.getFirstName()) && !isBlank(googleUser.firstName())) {
            user.setFirstName(googleUser.firstName());
        }
        if (isBlank(user.getLastName()) && !isBlank(googleUser.lastName())) {
            user.setLastName(googleUser.lastName());
        }
        if (!user.isEmailVerified()) {
            user.markEmailVerified();
            shouldSendWelcome = true;
        }
        if (user.getStatus() == UserStatus.PENDING) {
            user.activate();
            shouldSendWelcome = true;
        }
        addAvatarIfPresent(user, googleUser.avatarUrl());
        return new GoogleLoginResult(userRepositoryPort.save(user), shouldSendWelcome);
    }

    private void publishWelcomeEvent(UserModel user) {
        eventPublisher.publishEvent(UserWelcomeEvent.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .build());
    }

    private void addAvatarIfPresent(UserModel user, String avatarUrl) {
        if (isBlank(avatarUrl) || !isBlank(user.getImagePublicId())) {
            return;
        }
        try {
            RemoteFilePort.RemoteFile avatar = remoteFilePort.download(avatarUrl);
            StorageResult uploaded = storagePort.upload(new UploadRequest(
                    avatar.data(),
                    avatar.fileName(),
                    avatar.contentType(),
                    StorageFolderConstants.PROFILE_IMAGE_FOLDER
            ));
            user.replaceAvatar(uploaded.publicId(), uploaded.url());
        } catch (RuntimeException e) {
            log.warn("Failed to upload Google avatar to Cloudinary for user {}: {}", user.getEmail(), e.getMessage());
        }
    }

    private String defaultIfBlank(String value, String fallback) {
        return isBlank(value) ? fallback : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record GoogleLoginResult(UserModel user, boolean shouldSendWelcome) {
    }
}
