package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.user.CreateUserRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.dto.response.user.UserResponse;
import com.daiphat.coreapi.application.mapper.streetagent.StreetAgentProfileApplicationMapper;
import com.daiphat.coreapi.application.port.in.user.UserServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Street-agent onboarding identity")
class StreetAgentProfileOnboardingTest {

    @Mock private StreetAgentProfileRepositoryPort profileRepository;
    @Mock private StreetAgentProfileApplicationMapper profileMapper;
    @Mock private StoragePort storagePort;
    @Mock private UserServicePort userService;
    @Mock private SystemConfigRepositoryPort systemConfigRepository;

    private StreetAgentProfileService service;

    @BeforeEach
    void setUp() {
        service = new StreetAgentProfileService(
                profileRepository, profileMapper, storagePort, null, userService, systemConfigRepository);
    }

    @Test
    @DisplayName("creates the linked User as a non-login internal identity when email is omitted")
    void create_usesInternalUserWithoutEmail() {
        LocalDate start = LocalDate.now().plusDays(1);
        CreateStreetAgentProfileRequest request = new CreateStreetAgentProfileRequest(
                null, "Nguyen", "Van A", "0901234567", "079123456789", null,
                null, null, null, null, null, start, start.plusMonths(6), null, null, null);
        StreetAgentProfileModel model = StreetAgentProfileModel.builder()
                .contractStartDate(start)
                .contractEndDate(start.plusMonths(6))
                .build();
        UUID userId = UUID.randomUUID();
        StreetAgentProfileResponse response = StreetAgentProfileResponse.builder().id(1L).build();

        when(profileRepository.existsByPhone("0901234567")).thenReturn(false);
        when(profileRepository.existsByCccd("079123456789")).thenReturn(false);
        when(profileMapper.toModel(request)).thenReturn(model);
        when(systemConfigRepository.findActiveByConfigKey(any())).thenReturn(Optional.empty());
        when(userService.createInternalStreetAgent(any())).thenReturn(UserResponse.builder().id(userId).build());
        when(profileRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(profileMapper.toResponse(any())).thenReturn(response);

        service.create(request);

        ArgumentCaptor<CreateUserRequest> userRequest = ArgumentCaptor.forClass(CreateUserRequest.class);
        verify(userService).createInternalStreetAgent(userRequest.capture());
        verify(userService, never()).create(any());
        assertThat(userRequest.getValue().email()).isNull();
        assertThat(userRequest.getValue().phone()).isEqualTo("0901234567");
        assertThat(model.getUserId()).isEqualTo(userId);
        assertThat(model.getEmail()).isNull();
        assertThat(model.getDepositBalance()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(model.getContractMaxDailyCap()).isEqualTo(200);
    }

    @Test
    @DisplayName("uses the staff-selected contract cap instead of the default")
    void create_usesStaffSelectedContractCap() {
        LocalDate start = LocalDate.now().plusDays(1);
        CreateStreetAgentProfileRequest request = new CreateStreetAgentProfileRequest(
                null, "Nguyen", "Van B", "0901234568", "079123456780", null,
                null, null, null, null, null, start, start.plusMonths(6), null, null, 350);
        StreetAgentProfileModel model = StreetAgentProfileModel.builder()
                .contractStartDate(start)
                .contractEndDate(start.plusMonths(6))
                .build();
        UUID userId = UUID.randomUUID();

        when(profileRepository.existsByPhone("0901234568")).thenReturn(false);
        when(profileRepository.existsByCccd("079123456780")).thenReturn(false);
        when(profileMapper.toModel(request)).thenReturn(model);
        when(systemConfigRepository.findActiveByConfigKey(any())).thenReturn(Optional.empty());
        when(userService.createInternalStreetAgent(any())).thenReturn(UserResponse.builder().id(userId).build());
        when(profileRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(profileMapper.toResponse(any())).thenReturn(StreetAgentProfileResponse.builder().id(2L).build());

        service.create(request);

        assertThat(model.getContractMaxDailyCap()).isEqualTo(350);
    }
}
