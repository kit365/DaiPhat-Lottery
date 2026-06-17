package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentProfileServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StreetAgentProfileController")
class StreetAgentProfileControllerTest {

    private static final String FIRST_NAME = "Nguyen";
    private static final String LAST_NAME = "Van A";
    private static final String PHONE = "0901234567";
    private static final String CCCD = "079123456789";

    @Mock
    private StreetAgentProfileServicePort streetAgentProfileServicePort;

    private StreetAgentProfileController streetAgentProfileController;

    @BeforeEach
    void setUp() {
        streetAgentProfileController = new StreetAgentProfileController(streetAgentProfileServicePort);
    }

    @Test
    @DisplayName("POST /street-agent-profiles: tạo hồ sơ thành công")
    void create_success() {
        CreateStreetAgentProfileRequest request = new CreateStreetAgentProfileRequest(
                FIRST_NAME,
                LAST_NAME,
                PHONE,
                CCCD,
                null,
                "123 Nguyen Hue",
                "Ho Chi Minh",
                "Quan 1, Quan 3",
                new BigDecimal("0.05"),
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 12, 31),
                BigDecimal.ZERO,
                "ACTIVE"
        );
        StreetAgentProfileResponse serviceResponse = StreetAgentProfileResponse.builder()
                .id(1L)
                .firstName(FIRST_NAME)
                .lastName(LAST_NAME)
                .phone(PHONE)
                .cccd(CCCD)
                .status("ACTIVE")
                .build();

        when(streetAgentProfileServicePort.create(request)).thenReturn(serviceResponse);

        ApiResponse<StreetAgentProfileResponse> response = streetAgentProfileController.create(request);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Tạo hồ sơ đại lý bán dạo thành công.");
        assertThat(response.getData()).isEqualTo(serviceResponse);
        assertThat(response.getData().id()).isEqualTo(1L);
        assertThat(response.getData().phone()).isEqualTo(PHONE);
        verify(streetAgentProfileServicePort).create(request);
    }

    @Test
    @DisplayName("PUT /street-agent-profiles/{id}: cập nhật hồ sơ thành công")
    void update_success() {
        Long profileId = 1L;
        UpdateStreetAgentProfileRequest request = new UpdateStreetAgentProfileRequest(
                FIRST_NAME,
                LAST_NAME,
                PHONE,
                CCCD,
                null,
                "123 Nguyen Hue",
                "Ho Chi Minh",
                "Quan 1, Quan 3",
                new BigDecimal("0.05"),
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 12, 31),
                new BigDecimal("5000000"),
                "Điều chỉnh ký quỹ",
                "ACTIVE"
        );
        StreetAgentProfileResponse serviceResponse = StreetAgentProfileResponse.builder()
                .id(profileId)
                .firstName(FIRST_NAME)
                .lastName(LAST_NAME)
                .phone(PHONE)
                .cccd(CCCD)
                .status("ACTIVE")
                .build();

        when(streetAgentProfileServicePort.update(profileId, request)).thenReturn(serviceResponse);

        ApiResponse<StreetAgentProfileResponse> response =
                streetAgentProfileController.update(profileId, request);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Cập nhật hồ sơ đại lý bán dạo thành công.");
        assertThat(response.getData()).isEqualTo(serviceResponse);
        verify(streetAgentProfileServicePort).update(profileId, request);
    }
}
