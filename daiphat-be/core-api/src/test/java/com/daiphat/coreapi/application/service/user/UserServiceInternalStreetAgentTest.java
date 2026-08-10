package com.daiphat.coreapi.application.service.user;

import com.daiphat.coreapi.application.dto.request.user.CreateUserRequest;
import com.daiphat.coreapi.application.dto.response.user.UserResponse;
import com.daiphat.coreapi.application.mapper.UserApplicationMapper;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.in.user.UserValidationServicePort;
import com.daiphat.coreapi.application.port.out.auth.PasswordHashPort;
import com.daiphat.coreapi.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService internal street-agent identity")
class UserServiceInternalStreetAgentTest {

    @Mock private UserRepositoryPort userRepositoryPort;
    @Mock private UserApplicationMapper userApplicationMapper;
    @Mock private RoleRepositoryPort roleRepositoryPort;
    @Mock private PasswordHashPort passwordHashPort;
    @Mock private StoragePort storagePort;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private UserLookupServicePort userLookupService;
    @Mock private UserValidationServicePort userValidationService;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(
                userRepositoryPort, userApplicationMapper, roleRepositoryPort,
                passwordHashPort, storagePort, eventPublisher, userLookupService, userValidationService);
    }

    @Test
    @DisplayName("creates a 1:1 vendor identity without credentials or welcome email")
    void createInternalStreetAgent_createsNonLoginIdentity() {
        CreateUserRequest request = CreateUserRequest.builder()
                .firstName("Nguyen")
                .lastName("Van A")
                .phone("0901234567")
                .build();
        UserModel model = UserModel.builder().build();
        RoleModel streetAgentRole = RoleModel.builder().code(RoleConstants.ROLE_STREET_AGENT).build();
        UserResponse response = UserResponse.builder().build();

        when(userApplicationMapper.toUserModel(request)).thenReturn(model);
        when(roleRepositoryPort.findByCode(RoleConstants.ROLE_STREET_AGENT)).thenReturn(Optional.of(streetAgentRole));
        when(userRepositoryPort.save(any(UserModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userApplicationMapper.mapToUserResponse(any(UserModel.class))).thenReturn(response);

        userService.createInternalStreetAgent(request);

        ArgumentCaptor<UserModel> saved = ArgumentCaptor.forClass(UserModel.class);
        verify(userRepositoryPort).save(saved.capture());
        assertThat(saved.getValue().getUsername()).isEqualTo("street-agent-0901234567");
        assertThat(saved.getValue().getStatus()).isEqualTo(UserStatus.INTERNAL);
        assertThat(saved.getValue().getRole()).isSameAs(streetAgentRole);
        assertThat(saved.getValue().getPassword()).isNull();
        assertThat(saved.getValue().isHasPassword()).isFalse();
        assertThat(saved.getValue().isEmailVerified()).isFalse();
        verify(userValidationService).ensurePhoneAvailable("0901234567", null);
        verify(userValidationService).ensureUsernameAvailable("street-agent-0901234567", null);
        verify(userValidationService).ensureEmailAvailable(null, null);
        verify(passwordHashPort, never()).encode(any());
        verify(eventPublisher, never()).publishEvent(any());
    }
}
