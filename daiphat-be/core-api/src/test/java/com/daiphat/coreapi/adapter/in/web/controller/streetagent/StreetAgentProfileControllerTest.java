package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentProfileServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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
                BigDecimal.ZERO
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
    @DisplayName("GET /street-agent-profiles/{id}: lấy chi tiết hồ sơ thành công")
    void getById_success() {
        Long profileId = 1L;
        StreetAgentProfileResponse serviceResponse = StreetAgentProfileResponse.builder()
                .id(profileId)
                .firstName(FIRST_NAME)
                .lastName(LAST_NAME)
                .phone(PHONE)
                .cccd(CCCD)
                .status("ACTIVE")
                .build();

        when(streetAgentProfileServicePort.getById(profileId)).thenReturn(serviceResponse);

        ApiResponse<StreetAgentProfileResponse> response = streetAgentProfileController.getById(profileId);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isEqualTo(serviceResponse);
        verify(streetAgentProfileServicePort).getById(profileId);
    }

    @Nested
    @DisplayName("PUT /street-agent-profiles/{id}")
    class Update {

        @Test
        @DisplayName("cập nhật hồ sơ thành công với payload đầy đủ")
        void update_success_withFullPayload() {
            Long profileId = 1L;
            UpdateStreetAgentProfileRequest request = buildUpdateRequest();
            StreetAgentProfileResponse serviceResponse = StreetAgentProfileResponse.builder()
                    .id(profileId)
                    .firstName(FIRST_NAME)
                    .lastName(LAST_NAME)
                    .phone(PHONE)
                    .cccd(CCCD)
                    .imageUrl("https://cdn.example.com/avatar.jpg")
                    .contactAddress("123 Nguyen Hue")
                    .contactProvince("Ho Chi Minh")
                    .coverageArea("Quan 1, Quan 3")
                    .commissionRate(new BigDecimal("0.05"))
                    .contractStartDate(LocalDate.of(2026, 1, 1))
                    .contractEndDate(LocalDate.of(2026, 12, 31))
                    .depositBalance(new BigDecimal("5000000"))
                    .depositAdjustmentReason("Điều chỉnh ký quỹ")
                    .status("ACTIVE")
                    .build();

            when(streetAgentProfileServicePort.update(profileId, request)).thenReturn(serviceResponse);

            ApiResponse<StreetAgentProfileResponse> response =
                    streetAgentProfileController.update(profileId, request);

            assertThat(response).isNotNull();
            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getMessage()).isEqualTo("Cập nhật hồ sơ đại lý bán dạo thành công.");
            assertThat(response.getData()).isEqualTo(serviceResponse);
            assertThat(response.getData().id()).isEqualTo(profileId);
            assertThat(response.getData().phone()).isEqualTo(PHONE);
            assertThat(response.getData().cccd()).isEqualTo(CCCD);
            assertThat(response.getData().depositBalance()).isEqualByComparingTo("5000000");
            assertThat(response.getData().depositAdjustmentReason()).isEqualTo("Điều chỉnh ký quỹ");
            verify(streetAgentProfileServicePort).update(profileId, request);
        }

        @Test
        @DisplayName("ủy quyền cập nhật đúng id và request body")
        void update_delegatesToServiceWithCorrectArguments() {
            Long profileId = 42L;
            UpdateStreetAgentProfileRequest request = buildUpdateRequest();

            when(streetAgentProfileServicePort.update(profileId, request))
                    .thenReturn(StreetAgentProfileResponse.builder().id(profileId).build());

            streetAgentProfileController.update(profileId, request);

            verify(streetAgentProfileServicePort).update(profileId, request);
        }

        @Test
        @DisplayName("cập nhật trạng thái INACTIVE")
        void update_success_withInactiveStatus() {
            Long profileId = 2L;
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
                    null,
                    null,
                    "INACTIVE"
            );
            StreetAgentProfileResponse serviceResponse = StreetAgentProfileResponse.builder()
                    .id(profileId)
                    .status("INACTIVE")
                    .build();

            when(streetAgentProfileServicePort.update(profileId, request)).thenReturn(serviceResponse);

            ApiResponse<StreetAgentProfileResponse> response =
                    streetAgentProfileController.update(profileId, request);

            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getData().status()).isEqualTo("INACTIVE");
            verify(streetAgentProfileServicePort).update(profileId, request);
        }
    }

    @Test
    @DisplayName("DELETE /street-agent-profiles/{id}: xóa hồ sơ thành công")
    void delete_success() {
        Long profileId = 1L;

        ApiResponse<Void> response = streetAgentProfileController.delete(profileId);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Xóa hồ sơ đại lý bán dạo thành công.");
        verify(streetAgentProfileServicePort).delete(profileId);
    }

    private UpdateStreetAgentProfileRequest buildUpdateRequest() {
        return new UpdateStreetAgentProfileRequest(
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
    }
}
