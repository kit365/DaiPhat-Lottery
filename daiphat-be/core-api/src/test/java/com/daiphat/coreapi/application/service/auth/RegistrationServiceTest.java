package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.coreapi.application.event.UserRegisteredEvent;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.application.port.in.auth.RegistrationServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Core RegistrationService")
class RegistrationServiceTest extends AuthTestBase {

    private RegistrationServicePort registrationService;

    @BeforeEach
    void setUp() {
        registrationService = new RegistrationService(
                userRepositoryPort,
                roleRepositoryPort,
                verificationCachePort,
                eventPublisher,
                passwordHashPort,
                userApplicationMapper
        );
        ReflectionTestUtils.setField(registrationService, "verificationTokenTtlSeconds", 86400L);
    }

    @Test
    void register_success_savesPendingUserAndVerificationToken() {
        UserRegistrationRequest request = registrationRequest();
        UserModel mappedUser = UserModel.builder()
                .username(request.username())
                .email(request.email())
                .firstName(request.firstName())
                .lastName(request.lastName())
                .phoneNumber(request.phone())
                .build();
        UserModel savedUser = mappedUser;
        savedUser.setId(DEFAULT_USER_ID);

        when(roleRepositoryPort.findByCode(RoleConstants.ROLE_MEMBER)).thenReturn(Optional.of(defaultRole()));
        when(userApplicationMapper.mapToUserModel(request)).thenReturn(mappedUser);
        when(passwordHashPort.encode(request.password())).thenReturn(ENCODED_PASSWORD);
        when(userRepositoryPort.save(mappedUser)).thenReturn(savedUser);

        registrationService.register(request);

        assertThat(mappedUser.getPassword()).isEqualTo(ENCODED_PASSWORD);
        assertThat(mappedUser.getRole().getCode()).isEqualTo(RoleConstants.ROLE_MEMBER);
        assertThat(mappedUser.isEmailVerified()).isFalse();
        ArgumentCaptor<String> tokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(verificationCachePort).saveVerificationToken(tokenCaptor.capture(), eq(request.email()), eq(Duration.ofSeconds(86400)));
        assertThat(tokenCaptor.getValue()).isNotBlank();
        verify(eventPublisher).publishEvent(any(UserRegisteredEvent.class));
    }

    @Test
    void register_duplicateUsername_throwsUsernameExisted() {
        UserRegistrationRequest request = registrationRequest();
        when(userRepositoryPort.existsByUsername(request.username())).thenReturn(true);

        assertThatThrownBy(() -> registrationService.register(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.USERNAME_EXISTED);

        verify(userRepositoryPort, never()).save(any());
    }

    @Test
    void register_missingDefaultRole_throwsRoleNotFound() {
        UserRegistrationRequest request = registrationRequest();
        when(roleRepositoryPort.findByCode(RoleConstants.ROLE_MEMBER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> registrationService.register(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ROLE_NOT_FOUND);
    }

    @Test
    void verifyEmail_success_activatesUserAndDeletesToken() {
        UserModel user = activeUser();
        user.setEmailVerified(false);
        user.setStatus(UserStatus.PENDING);

        when(verificationCachePort.getEmailByVerificationToken(RESET_TOKEN)).thenReturn(Optional.of(DEFAULT_EMAIL));
        when(userRepositoryPort.findByEmail(DEFAULT_EMAIL)).thenReturn(Optional.of(user));

        registrationService.verifyEmail(RESET_TOKEN);

        assertThat(user.isEmailVerified()).isTrue();
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(userRepositoryPort).save(user);
        verify(verificationCachePort).deleteVerificationToken(RESET_TOKEN);
    }

    @Test
    void resendVerificationEmail_alreadyVerified_doesNothing() {
        UserModel user = activeUser();
        when(userRepositoryPort.findByUsernameOrEmail(DEFAULT_EMAIL)).thenReturn(Optional.of(user));

        registrationService.resendVerificationEmail(DEFAULT_EMAIL);

        verify(verificationCachePort, never()).saveVerificationToken(any(), any(), any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    private UserRegistrationRequest registrationRequest() {
        return UserRegistrationRequest.builder()
                .username(DEFAULT_USERNAME)
                .email(DEFAULT_EMAIL)
                .password(DEFAULT_PASSWORD)
                .firstName("Kiet")
                .lastName("Ngo")
                .phone("0901234567")
                .agreedToTerms(true)
                .build();
    }
}
