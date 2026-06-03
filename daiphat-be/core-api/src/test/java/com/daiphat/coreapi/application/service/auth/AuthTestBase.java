package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.mapper.AuthApplicationMapper;
import com.daiphat.coreapi.application.mapper.UserApplicationMapper;
import com.daiphat.coreapi.application.port.in.auth.LoginServicePort;
import com.daiphat.coreapi.application.port.in.auth.PasswordResetServicePort;
import com.daiphat.coreapi.application.port.in.auth.RegistrationServicePort;
import com.daiphat.coreapi.application.port.in.auth.RoleServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.PasswordHashPort;
import com.daiphat.coreapi.application.port.out.RefreshTokenStorePort;
import com.daiphat.coreapi.application.port.out.RemoteFilePort;
import com.daiphat.coreapi.application.port.out.StoragePort;
import com.daiphat.coreapi.application.port.out.TokenProviderPort;
import com.daiphat.coreapi.application.port.out.auth.GoogleOAuthPort;
import com.daiphat.coreapi.application.port.out.auth.OtpCachePort;
import com.daiphat.coreapi.application.port.out.auth.PasswordResetCachePort;
import com.daiphat.coreapi.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.coreapi.application.port.out.auth.VerificationCachePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.RoleModel;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.UserStatus;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.UUID;

@ExtendWith(MockitoExtension.class)
abstract class AuthTestBase {

    static final UUID DEFAULT_USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    static final String DEFAULT_USERNAME = "tuankiet";
    static final String DEFAULT_EMAIL = "tuankiet@daiphat.com";
    static final String DEFAULT_PASSWORD = "Password1";
    static final String ENCODED_PASSWORD = "{bcrypt}encoded-password";
    static final String ACCESS_TOKEN = "access-token";
    static final String REFRESH_TOKEN = "refresh-token";
    static final String NEW_REFRESH_TOKEN = "new-refresh-token";
    static final String DEFAULT_OTP = "123456";
    static final String RESET_TOKEN = "reset-token";

    @Mock
    UserLookupServicePort userLookupService;
    @Mock
    UserRepositoryPort userRepositoryPort;
    @Mock
    RoleServicePort roleService;
    @Mock
    GoogleOAuthPort googleOAuthPort;
    @Mock
    PasswordHashPort passwordHashPort;
    @Mock
    StoragePort storagePort;
    @Mock
    RemoteFilePort remoteFilePort;
    @Mock
    TokenProviderPort tokenProviderPort;
    @Mock
    RefreshTokenStorePort refreshTokenStorePort;
    @Mock
    AuthApplicationMapper authApplicationMapper;
    @Mock
    RoleRepositoryPort roleRepositoryPort;
    @Mock
    VerificationCachePort verificationCachePort;
    @Mock
    UserApplicationMapper userApplicationMapper;
    @Mock
    PasswordResetCachePort passwordResetCachePort;
    @Mock
    OtpCachePort otpCachePort;
    @Mock
    ApplicationEventPublisher eventPublisher;
    @Mock
    LoginServicePort loginServicePort;
    @Mock
    RegistrationServicePort registrationServicePort;
    @Mock
    PasswordResetServicePort passwordResetServicePort;

    UserModel activeUser() {
        return UserModel.builder()
                .id(DEFAULT_USER_ID)
                .username(DEFAULT_USERNAME)
                .email(DEFAULT_EMAIL)
                .firstName("Kiet")
                .lastName("Ngo")
                .password(ENCODED_PASSWORD)
                .status(UserStatus.ACTIVE)
                .emailVerified(true)
                .hasPassword(true)
                .role(defaultRole())
                .build();
    }

    RoleModel defaultRole() {
        return RoleModel.builder()
                .id(UUID.fromString("22222222-2222-2222-2222-222222222222"))
                .code(RoleConstants.ROLE_MEMBER)
                .name("Member")
                .build();
    }
}
