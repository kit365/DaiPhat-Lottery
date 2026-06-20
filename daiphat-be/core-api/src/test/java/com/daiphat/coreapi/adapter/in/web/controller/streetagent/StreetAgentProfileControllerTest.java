package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentProfileServicePort;
import com.daiphat.coreapi.shared.util.StatusCountKeys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
    private static final Long PROFILE_ID = 1L;

    @Mock
    private StreetAgentProfileServicePort streetAgentProfileServicePort;

    private StreetAgentProfileController streetAgentProfileController;

    @BeforeEach
    void setUp() {
        streetAgentProfileController = new StreetAgentProfileController(streetAgentProfileServicePort);
    }

    @Nested
    @DisplayName("GET /street-agent-profiles")
    class GetAll {

        @Test
        @DisplayName("trả về danh sách phân trang thành công")
        void getAll_success() {
            StreetAgentProfileResponse profile = buildProfileResponse();
            PageResponse<StreetAgentProfileResponse> serviceResponse = PageResponse.from(
                    List.of(profile),
                    1L,
                    1,
                    10
            );
            serviceResponse.setStatusCounts(Map.of(
                    StatusCountKeys.ALL, 1L,
                    "ACTIVE", 1L,
                    "INACTIVE", 0L
            ));

            when(streetAgentProfileServicePort.getAll(1, 10, null, null)).thenReturn(serviceResponse);

            ApiResponse<PageResponse<StreetAgentProfileResponse>> response =
                    streetAgentProfileController.getAll(1, 10, null, null);

            assertThat(response).isNotNull();
            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getData().getRecordList()).hasSize(1);
            assertThat(response.getData().getRecordList().getFirst().id()).isEqualTo(PROFILE_ID);
            assertThat(response.getData().getRecordList().getFirst().phone()).isEqualTo(PHONE);
            assertThat(response.getData().getPagination().getTotalRecords()).isEqualTo(1L);
            assertThat(response.getData().getStatusCounts())
                    .containsEntry(StatusCountKeys.ALL, 1L)
                    .containsEntry("ACTIVE", 1L);
            verify(streetAgentProfileServicePort).getAll(1, 10, null, null);
        }

        @Test
        @DisplayName("ủy quyền tìm kiếm và lọc trạng thái cho service")
        void getAll_withSearchAndStatus() {
            PageResponse<StreetAgentProfileResponse> emptyPage = PageResponse.from(List.of(), 0L, 1, 10);
            when(streetAgentProfileServicePort.getAll(1, 10, "Van A", "ACTIVE")).thenReturn(emptyPage);

            ApiResponse<PageResponse<StreetAgentProfileResponse>> response =
                    streetAgentProfileController.getAll(1, 10, "Van A", "ACTIVE");

            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getData().getRecordList()).isEmpty();
            verify(streetAgentProfileServicePort).getAll(1, 10, "Van A", "ACTIVE");
        }
    }

    @Nested
    @DisplayName("GET /street-agent-profiles/{id}")
    class GetById {

        @Test
        @DisplayName("lấy chi tiết hồ sơ thành công")
        void getById_success() {
            StreetAgentProfileResponse serviceResponse = buildProfileResponse();

            when(streetAgentProfileServicePort.getById(PROFILE_ID)).thenReturn(serviceResponse);

            ApiResponse<StreetAgentProfileResponse> response =
                    streetAgentProfileController.getById(PROFILE_ID);

            assertThat(response).isNotNull();
            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getData()).isEqualTo(serviceResponse);
            assertThat(response.getData().id()).isEqualTo(PROFILE_ID);
            assertThat(response.getData().firstName()).isEqualTo(FIRST_NAME);
            assertThat(response.getData().lastName()).isEqualTo(LAST_NAME);
            assertThat(response.getData().phone()).isEqualTo(PHONE);
            assertThat(response.getData().cccd()).isEqualTo(CCCD);
            assertThat(response.getData().status()).isEqualTo("ACTIVE");
            verify(streetAgentProfileServicePort).getById(PROFILE_ID);
        }
    }

    @Nested
    @DisplayName("POST /street-agent-profiles")
    class Create {

        @Test
        @DisplayName("tạo hồ sơ thành công")
        void create_success() {
            CreateStreetAgentProfileRequest request = buildCreateRequest();
            StreetAgentProfileResponse serviceResponse = buildProfileResponse();

            when(streetAgentProfileServicePort.create(request)).thenReturn(serviceResponse);

            ApiResponse<StreetAgentProfileResponse> response = streetAgentProfileController.create(request);

            assertThat(response).isNotNull();
            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getMessage()).isEqualTo("Tạo hồ sơ đại lý bán dạo thành công.");
            assertThat(response.getData()).isEqualTo(serviceResponse);
            assertThat(response.getData().id()).isEqualTo(PROFILE_ID);
            assertThat(response.getData().phone()).isEqualTo(PHONE);
            verify(streetAgentProfileServicePort).create(request);
        }
    }

    @Nested
    @DisplayName("PUT /street-agent-profiles/{id}")
    class Update {

        @Test
        @DisplayName("cập nhật hồ sơ thành công với payload đầy đủ")
        void update_success_withFullPayload() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest();
            StreetAgentProfileResponse serviceResponse = StreetAgentProfileResponse.builder()
                    .id(PROFILE_ID)
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

            when(streetAgentProfileServicePort.update(PROFILE_ID, request)).thenReturn(serviceResponse);

            ApiResponse<StreetAgentProfileResponse> response =
                    streetAgentProfileController.update(PROFILE_ID, request);

            assertThat(response).isNotNull();
            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getMessage()).isEqualTo("Cập nhật hồ sơ đại lý bán dạo thành công.");
            assertThat(response.getData()).isEqualTo(serviceResponse);
            assertThat(response.getData().depositBalance()).isEqualByComparingTo("5000000");
            assertThat(response.getData().depositAdjustmentReason()).isEqualTo("Điều chỉnh ký quỹ");
            verify(streetAgentProfileServicePort).update(PROFILE_ID, request);
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

    @Nested
    @DisplayName("DELETE /street-agent-profiles/{id}")
    class Delete {

        @Test
        @DisplayName("xóa hồ sơ thành công")
        void delete_success() {
            ApiResponse<Void> response = streetAgentProfileController.delete(PROFILE_ID);

            assertThat(response).isNotNull();
            assertThat(response.isSuccess()).isTrue();
            assertThat(response.getMessage()).isEqualTo("Xóa hồ sơ đại lý bán dạo thành công.");
            verify(streetAgentProfileServicePort).delete(PROFILE_ID);
        }
    }

    private CreateStreetAgentProfileRequest buildCreateRequest() {
        return new CreateStreetAgentProfileRequest(
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

    private StreetAgentProfileResponse buildProfileResponse() {
        return StreetAgentProfileResponse.builder()
                .id(PROFILE_ID)
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
                .status("ACTIVE")
                .createdAt(LocalDateTime.of(2026, 6, 17, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 6, 17, 10, 0))
                .createdBy("operator")
                .lastModifiedBy("operator")
                .build();
    }
}
