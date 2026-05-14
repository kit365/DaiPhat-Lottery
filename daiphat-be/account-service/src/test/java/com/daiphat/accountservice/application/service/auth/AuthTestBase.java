package com.daiphat.accountservice.application.service.auth;

import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.port.in.user.UserServicePort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.application.port.out.auth.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.auth.DistributedLockPort;
import com.daiphat.accountservice.application.port.out.auth.LoginAttemptPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Duration;
import java.util.UUID;
import java.util.function.Supplier;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
public abstract class AuthTestBase {

        @Mock
        protected UserServicePort userService;
        @Mock
        protected UserRepositoryPort userRepositoryPort;
        @Mock
        protected IdentityManagementPort identityManagementPort;
        @Mock
        protected AuthProperties authProperties;
        @Mock
        protected LoginAttemptPort loginAttemptService;
        @Mock
        protected RateLimiterPort rateLimiterService;
        @Mock
        protected DistributedLockPort lockManager;
        @Mock
        protected ApplicationEventPublisher eventPublisher;

        protected static final String DEFAULT_USERNAME = "tuankiet123";
        protected static final String DEFAULT_EMAIL = "tuankiet@daiphat.com";
        protected static final String DEFAULT_PASSWORD = "Pass123456@";
        protected static final String DEFAULT_TOKEN = UUID.randomUUID().toString();
        protected static final String DEFAULT_REFRESH_TOKEN = UUID.randomUUID().toString();
        protected static final String NEW_ACCESS_TOKEN = UUID.randomUUID().toString();
        protected static final String MALFORMED_UUID = "malformed-" + UUID.randomUUID().toString();
        protected static final String WRONG_PASSWORD = "wrong-password-999";
        protected static final String NOT_FOUND_USERNAME = "missing-user";
        protected static final String DEFAULT_OTP = "123456";
        protected static final String WRONG_OTP = "999999";
        protected static final String MALFORMED_OTP = "otp-" + java.util.UUID.randomUUID().toString().substring(0, 4);
        protected static final String DEFAULT_FRONTEND_URL = "https://fe-"
                        + java.util.UUID.randomUUID().toString().substring(0, 8) + ".daiphat.com";

        protected static final String TC_LOGIN_PREFIX = "TC-LOGIN-";
        protected static final String TC_REG_PREFIX = "TC-REG-";
        protected static final String TC_LOGOUT_PREFIX = "TC-LOGOUT-";
        protected static final String TC_FGT_PREFIX = "TC-FGT-";

        @BeforeEach
        protected void setUp() {
                AuthProperties.Token tokenProps = mock(AuthProperties.Token.class);
                AuthProperties.Lockout lockoutProps = mock(AuthProperties.Lockout.class);
                AuthProperties.Lockout.Spam spamProps = mock(AuthProperties.Lockout.Spam.class);
                AuthProperties.Cache cacheConfig = mock(AuthProperties.Cache.class);
                AuthProperties.PasswordPolicy policyConfig = mock(AuthProperties.PasswordPolicy.class);
                AuthProperties.VerificationPaths verificationPaths = mock(AuthProperties.VerificationPaths.class);

                lenient().when(authProperties.getVerificationPaths()).thenReturn(verificationPaths);
                lenient().when(verificationPaths.getClientPath()).thenReturn("/verify-email?token=");
                lenient().when(verificationPaths.getAdminPath()).thenReturn("/admin/verify-email?token=");

                lenient().when(authProperties.getToken()).thenReturn(tokenProps);
                lenient().when(tokenProps.getRememberMeTtl()).thenReturn(Duration.ofDays(30));

                lenient().when(authProperties.getLockout()).thenReturn(lockoutProps);
                lenient().when(lockoutProps.getSpam()).thenReturn(spamProps);
                lenient().when(spamProps.getMaxAttempts()).thenReturn(5);
                lenient().when(spamProps.getWindowSeconds()).thenReturn(60);
                lenient().when(lockoutProps.getMaxDuration()).thenReturn(Duration.ofMinutes(10));

                lenient().when(authProperties.getCache()).thenReturn(cacheConfig);
                lenient().when(cacheConfig.getVerificationTokenTtl()).thenReturn(Duration.ofHours(24));
                lenient().when(authProperties.getFrontendUrl()).thenReturn(DEFAULT_FRONTEND_URL);

                lenient().when(authProperties.getPasswordPolicy()).thenReturn(policyConfig);
                lenient().when(policyConfig.getMinLength()).thenReturn(8);
                lenient().when(policyConfig.getMaxLength()).thenReturn(32);
                lenient().when(policyConfig.getPattern())
                                .thenReturn("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,32}$");

                lenient().when(lockoutProps.getLockTimeout()).thenReturn(Duration.ofSeconds(0));

                // Rate Limiter defaults
                lenient().when(rateLimiterService.checkAndRecordFixed(anyString(), any(AuthAction.class), anyInt(),
                                anyLong()))
                                .thenReturn(true);
                lenient().when(rateLimiterService.checkAndRecord(anyString(), any(AuthAction.class)))
                                .thenReturn(true);
                lenient().when(rateLimiterService.checkRateLimit(anyString(), any(AuthAction.class)))
                                .thenReturn(true);

                // Distributed Lock defaults
                lenient().when(lockManager.tryLock(anyString(), any())).thenReturn(true);

                // Login Attempt defaults
                lenient().when(loginAttemptService.executeSecurely(anyString(), any()))
                                .thenAnswer(invocation -> ((Supplier<?>) invocation.getArgument(1)).get());
        }
}
