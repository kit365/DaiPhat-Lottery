package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.mapper.streetagent.StreetAgentProfileApplicationMapper;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StreetAgentProfileService")
class StreetAgentProfileServiceTest {

    private static final String FIRST_NAME = "Nguyen";
    private static final String LAST_NAME = "Van A";
    private static final String PHONE = "0901234567";
    private static final String CCCD = "079123456789";
    private static final String IMAGE_URL = "https://cdn.example.com/avatar.jpg";
    private static final Long PROFILE_ID = 1L;

    @Mock
    private StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort;

    @Mock
    private StreetAgentProfileApplicationMapper streetAgentProfileApplicationMapper;

    private StreetAgentProfileService streetAgentProfileService;

    @BeforeEach
    void setUp() {
        streetAgentProfileService = new StreetAgentProfileService(
                streetAgentProfileRepositoryPort,
                streetAgentProfileApplicationMapper
        );
    }

    @Nested
    @DisplayName("Tạo hồ sơ thành công")
    class CreateSuccess {

        @Test
        @DisplayName("tạo hồ sơ đầy đủ thông tin")
        void create_withFullPayload() {
            CreateStreetAgentProfileRequest request = buildRequest(
                    LocalDate.of(2026, 1, 1),
                    LocalDate.of(2026, 12, 31),
                    new BigDecimal("5000000"),
                    "ACTIVE"
            );
            StreetAgentProfileModel model = buildModel();
            StreetAgentProfileModel saved = buildSavedModel();
            StreetAgentProfileResponse response = buildResponse();

            stubUniqueConstraintsPass();
            when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(model);
            when(streetAgentProfileRepositoryPort.save(model)).thenReturn(saved);
            when(streetAgentProfileApplicationMapper.toResponse(saved)).thenReturn(response);

            StreetAgentProfileResponse result = streetAgentProfileService.create(request);

            assertThat(result.id()).isEqualTo(PROFILE_ID);
            assertThat(result.firstName()).isEqualTo(FIRST_NAME);
            assertThat(result.lastName()).isEqualTo(LAST_NAME);
            assertThat(result.phone()).isEqualTo(PHONE);
            assertThat(result.cccd()).isEqualTo(CCCD);
            assertThat(result.imageUrl()).isEqualTo(IMAGE_URL);
            assertThat(result.contactAddress()).isEqualTo("123 Nguyen Hue");
            assertThat(result.contactProvince()).isEqualTo("Ho Chi Minh");
            assertThat(result.coverageArea()).isEqualTo("Quan 1, Quan 3");
            assertThat(result.commissionRate()).isEqualByComparingTo("0.05");
            assertThat(result.depositBalance()).isEqualByComparingTo("5000000");
            assertThat(result.status()).isEqualTo("ACTIVE");

            verify(streetAgentProfileRepositoryPort).existsByPhone(PHONE);
            verify(streetAgentProfileRepositoryPort).existsByCccd(CCCD);
            verify(streetAgentProfileApplicationMapper).toModel(request);
            verify(streetAgentProfileRepositoryPort).save(model);
            verify(streetAgentProfileApplicationMapper).toResponse(saved);
        }

        @Test
        @DisplayName("mặc định depositBalance = 0 khi null")
        void create_defaultsDepositBalanceWhenNull() {
            CreateStreetAgentProfileRequest request = buildRequest(null, null, null, "ACTIVE");
            StreetAgentProfileModel model = buildModel();
            model.setDepositBalance(null);

            stubUniqueConstraintsPass();
            when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(model);
            when(streetAgentProfileRepositoryPort.save(any())).thenAnswer(invocation -> {
                StreetAgentProfileModel toSave = invocation.getArgument(0);
                toSave.setId(PROFILE_ID);
                return toSave;
            });
            when(streetAgentProfileApplicationMapper.toResponse(any())).thenReturn(buildResponse());

            streetAgentProfileService.create(request);

            ArgumentCaptor<StreetAgentProfileModel> captor =
                    ArgumentCaptor.forClass(StreetAgentProfileModel.class);
            verify(streetAgentProfileRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().getDepositBalance()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("chỉ có ngày bắt đầu hợp đồng")
        void create_withOnlyContractStartDate() {
            CreateStreetAgentProfileRequest request = buildRequest(
                    LocalDate.of(2026, 3, 1),
                    null,
                    BigDecimal.ZERO,
                    "PENDING"
            );
            StreetAgentProfileModel model = buildModel();
            model.setStatus(StreetAgentProfileStatus.PENDING);
            model.setContractStartDate(LocalDate.of(2026, 3, 1));
            model.setContractEndDate(null);

            stubUniqueConstraintsPass();
            when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(model);
            when(streetAgentProfileRepositoryPort.save(model)).thenReturn(buildSavedModel());
            when(streetAgentProfileApplicationMapper.toResponse(any())).thenReturn(buildResponse());

            assertThat(streetAgentProfileService.create(request).id()).isEqualTo(PROFILE_ID);
            verify(streetAgentProfileRepositoryPort).save(model);
        }

        @Test
        @DisplayName("ngày bắt đầu và kết thúc trùng nhau")
        void create_withSameContractDates() {
            LocalDate sameDate = LocalDate.of(2026, 6, 1);
            CreateStreetAgentProfileRequest request = buildRequest(sameDate, sameDate, BigDecimal.ZERO, "ACTIVE");

            stubUniqueConstraintsPass();
            when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(buildModel());
            when(streetAgentProfileRepositoryPort.save(any())).thenReturn(buildSavedModel());
            when(streetAgentProfileApplicationMapper.toResponse(any())).thenReturn(buildResponse());

            assertThat(streetAgentProfileService.create(request).id()).isEqualTo(PROFILE_ID);
        }

        @Test
        @DisplayName("không có thông tin hợp đồng")
        void create_withoutContractDates() {
            CreateStreetAgentProfileRequest request = buildRequest(null, null, BigDecimal.ZERO, "ACTIVE");

            stubUniqueConstraintsPass();
            when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(buildModel());
            when(streetAgentProfileRepositoryPort.save(any())).thenReturn(buildSavedModel());
            when(streetAgentProfileApplicationMapper.toResponse(any())).thenReturn(buildResponse());

            assertThat(streetAgentProfileService.create(request).id()).isEqualTo(PROFILE_ID);
        }
    }

    @Nested
    @DisplayName("Validation thất bại")
    class CreateValidationFailure {

        @Test
        @DisplayName("số điện thoại đã tồn tại")
        void create_phoneExisted() {
            CreateStreetAgentProfileRequest request = buildRequest(null, null, BigDecimal.ZERO, "ACTIVE");
            when(streetAgentProfileRepositoryPort.existsByPhone(PHONE)).thenReturn(true);

            assertThatThrownBy(() -> streetAgentProfileService.create(request))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> assertThat(((DomainException) ex).getErrorCode())
                            .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_PHONE_EXISTED));

            verify(streetAgentProfileRepositoryPort, never()).existsByCccd(any());
            verify(streetAgentProfileRepositoryPort, never()).save(any());
            verifyNoInteractions(streetAgentProfileApplicationMapper);
        }

        @Test
        @DisplayName("CCCD đã tồn tại")
        void create_cccdExisted() {
            CreateStreetAgentProfileRequest request = buildRequest(null, null, BigDecimal.ZERO, "ACTIVE");
            when(streetAgentProfileRepositoryPort.existsByPhone(PHONE)).thenReturn(false);
            when(streetAgentProfileRepositoryPort.existsByCccd(CCCD)).thenReturn(true);

            assertThatThrownBy(() -> streetAgentProfileService.create(request))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> assertThat(((DomainException) ex).getErrorCode())
                            .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_CCCD_EXISTED));

            verify(streetAgentProfileRepositoryPort, never()).save(any());
            verifyNoInteractions(streetAgentProfileApplicationMapper);
        }

        @Test
        @DisplayName("ngày kết thúc hợp đồng trước ngày bắt đầu")
        void create_invalidContractDate() {
            CreateStreetAgentProfileRequest request = buildRequest(
                    LocalDate.of(2026, 6, 1),
                    LocalDate.of(2026, 1, 1),
                    BigDecimal.ZERO,
                    "ACTIVE"
            );
            when(streetAgentProfileRepositoryPort.existsByPhone(PHONE)).thenReturn(false);
            when(streetAgentProfileRepositoryPort.existsByCccd(CCCD)).thenReturn(false);

            assertThatThrownBy(() -> streetAgentProfileService.create(request))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> assertThat(((DomainException) ex).getErrorCode())
                            .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_INVALID_CONTRACT_DATE));

            verify(streetAgentProfileRepositoryPort, never()).save(any());
            verifyNoInteractions(streetAgentProfileApplicationMapper);
        }
    }

    @Nested
    @DisplayName("Cập nhật hồ sơ thành công")
    class UpdateSuccess {

        @Test
        @DisplayName("cập nhật hồ sơ đầy đủ thông tin")
        void update_withFullPayload() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(
                    LocalDate.of(2026, 2, 1),
                    LocalDate.of(2026, 11, 30),
                    new BigDecimal("7000000"),
                    "Tăng ký quỹ",
                    "INACTIVE"
            );
            StreetAgentProfileModel existing = buildSavedModel();
            StreetAgentProfileModel saved = buildSavedModel();
            saved.setDepositBalance(new BigDecimal("7000000"));
            saved.setStatus(StreetAgentProfileStatus.INACTIVE);
            StreetAgentProfileResponse response = buildResponse();

            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(existing));
            when(streetAgentProfileRepositoryPort.existsByPhoneAndIdNot(PHONE, PROFILE_ID)).thenReturn(false);
            when(streetAgentProfileRepositoryPort.existsByCccdAndIdNot(CCCD, PROFILE_ID)).thenReturn(false);
            doAnswer(invocation -> {
                StreetAgentProfileModel model = invocation.getArgument(0);
                UpdateStreetAgentProfileRequest req = invocation.getArgument(1);
                model.setFirstName(req.firstName());
                model.setLastName(req.lastName());
                model.setStatus(StreetAgentProfileStatus.INACTIVE);
                model.setDepositAdjustmentReason(req.depositAdjustmentReason());
                return null;
            }).when(streetAgentProfileApplicationMapper).updateModel(eq(existing), eq(request));
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(saved);
            when(streetAgentProfileApplicationMapper.toResponse(saved)).thenReturn(response);

            StreetAgentProfileResponse result = streetAgentProfileService.update(PROFILE_ID, request);

            assertThat(result.id()).isEqualTo(PROFILE_ID);
            verify(streetAgentProfileRepositoryPort).findById(PROFILE_ID);
            verify(streetAgentProfileRepositoryPort).existsByPhoneAndIdNot(PHONE, PROFILE_ID);
            verify(streetAgentProfileRepositoryPort).existsByCccdAndIdNot(CCCD, PROFILE_ID);
            verify(streetAgentProfileApplicationMapper).updateModel(existing, request);
            verify(streetAgentProfileRepositoryPort).save(existing);
        }

        @Test
        @DisplayName("giữ nguyên depositBalance khi null")
        void update_keepsDepositBalanceWhenNull() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(null, null, null, null, "ACTIVE");
            StreetAgentProfileModel existing = buildSavedModel();

            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(existing));
            when(streetAgentProfileRepositoryPort.existsByPhoneAndIdNot(PHONE, PROFILE_ID)).thenReturn(false);
            when(streetAgentProfileRepositoryPort.existsByCccdAndIdNot(CCCD, PROFILE_ID)).thenReturn(false);
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(existing);
            when(streetAgentProfileApplicationMapper.toResponse(existing)).thenReturn(buildResponse());

            streetAgentProfileService.update(PROFILE_ID, request);

            assertThat(existing.getDepositBalance()).isEqualByComparingTo("5000000");
        }
    }

    @Nested
    @DisplayName("Cập nhật thất bại")
    class UpdateValidationFailure {

        @Test
        @DisplayName("không tìm thấy hồ sơ")
        void update_notFound() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(null, null, BigDecimal.ZERO, null, "ACTIVE");
            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> streetAgentProfileService.update(PROFILE_ID, request))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> assertThat(((DomainException) ex).getErrorCode())
                            .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));

            verify(streetAgentProfileRepositoryPort, never()).save(any());
        }

        @Test
        @DisplayName("số điện thoại đã tồn tại")
        void update_phoneExisted() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(null, null, BigDecimal.ZERO, null, "ACTIVE");
            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(buildSavedModel()));
            when(streetAgentProfileRepositoryPort.existsByPhoneAndIdNot(PHONE, PROFILE_ID)).thenReturn(true);

            assertThatThrownBy(() -> streetAgentProfileService.update(PROFILE_ID, request))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> assertThat(((DomainException) ex).getErrorCode())
                            .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_PHONE_EXISTED));

            verify(streetAgentProfileRepositoryPort, never()).save(any());
        }

        @Test
        @DisplayName("CCCD đã tồn tại")
        void update_cccdExisted() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(null, null, BigDecimal.ZERO, null, "ACTIVE");
            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(buildSavedModel()));
            when(streetAgentProfileRepositoryPort.existsByPhoneAndIdNot(PHONE, PROFILE_ID)).thenReturn(false);
            when(streetAgentProfileRepositoryPort.existsByCccdAndIdNot(CCCD, PROFILE_ID)).thenReturn(true);

            assertThatThrownBy(() -> streetAgentProfileService.update(PROFILE_ID, request))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> assertThat(((DomainException) ex).getErrorCode())
                            .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_CCCD_EXISTED));

            verify(streetAgentProfileRepositoryPort, never()).save(any());
        }

        @Test
        @DisplayName("ngày kết thúc hợp đồng trước ngày bắt đầu")
        void update_invalidContractDate() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(
                    LocalDate.of(2026, 6, 1),
                    LocalDate.of(2026, 1, 1),
                    BigDecimal.ZERO,
                    null,
                    "ACTIVE"
            );
            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(buildSavedModel()));
            when(streetAgentProfileRepositoryPort.existsByPhoneAndIdNot(PHONE, PROFILE_ID)).thenReturn(false);
            when(streetAgentProfileRepositoryPort.existsByCccdAndIdNot(CCCD, PROFILE_ID)).thenReturn(false);

            assertThatThrownBy(() -> streetAgentProfileService.update(PROFILE_ID, request))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> assertThat(((DomainException) ex).getErrorCode())
                            .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_INVALID_CONTRACT_DATE));

            verify(streetAgentProfileRepositoryPort, never()).save(any());
        }
    }

    private UpdateStreetAgentProfileRequest buildUpdateRequest(
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal depositBalance,
            String depositAdjustmentReason,
            String status) {
        return new UpdateStreetAgentProfileRequest(
                FIRST_NAME,
                LAST_NAME,
                PHONE,
                CCCD,
                IMAGE_URL,
                "123 Nguyen Hue",
                "Ho Chi Minh",
                "Quan 1, Quan 3",
                new BigDecimal("0.05"),
                startDate,
                endDate,
                depositBalance,
                depositAdjustmentReason,
                status
        );
    }

    private void stubUniqueConstraintsPass() {
        when(streetAgentProfileRepositoryPort.existsByPhone(PHONE)).thenReturn(false);
        when(streetAgentProfileRepositoryPort.existsByCccd(CCCD)).thenReturn(false);
    }

    private CreateStreetAgentProfileRequest buildRequest(
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal depositBalance,
            String status) {
        return new CreateStreetAgentProfileRequest(
                FIRST_NAME,
                LAST_NAME,
                PHONE,
                CCCD,
                IMAGE_URL,
                "123 Nguyen Hue",
                "Ho Chi Minh",
                "Quan 1, Quan 3",
                new BigDecimal("0.05"),
                startDate,
                endDate,
                depositBalance,
                status
        );
    }

    private StreetAgentProfileModel buildModel() {
        return StreetAgentProfileModel.builder()
                .firstName(FIRST_NAME)
                .lastName(LAST_NAME)
                .phone(PHONE)
                .cccd(CCCD)
                .imageUrl(IMAGE_URL)
                .contactAddress("123 Nguyen Hue")
                .contactProvince("Ho Chi Minh")
                .coverageArea("Quan 1, Quan 3")
                .commissionRate(new BigDecimal("0.05"))
                .contractStartDate(LocalDate.of(2026, 1, 1))
                .contractEndDate(LocalDate.of(2026, 12, 31))
                .depositBalance(new BigDecimal("5000000"))
                .status(StreetAgentProfileStatus.ACTIVE)
                .build();
    }

    private StreetAgentProfileModel buildSavedModel() {
        StreetAgentProfileModel model = buildModel();
        model.setId(PROFILE_ID);
        model.setCreatedAt(LocalDateTime.of(2026, 6, 17, 10, 0));
        model.setUpdatedAt(LocalDateTime.of(2026, 6, 17, 10, 0));
        model.setCreatedBy("operator");
        model.setLastModifiedBy("operator");
        return model;
    }

    private StreetAgentProfileResponse buildResponse() {
        return StreetAgentProfileResponse.builder()
                .id(PROFILE_ID)
                .firstName(FIRST_NAME)
                .lastName(LAST_NAME)
                .phone(PHONE)
                .cccd(CCCD)
                .imageUrl(IMAGE_URL)
                .contactAddress("123 Nguyen Hue")
                .contactProvince("Ho Chi Minh")
                .coverageArea("Quan 1, Quan 3")
                .commissionRate(new BigDecimal("0.05"))
                .contractStartDate(LocalDate.of(2026, 1, 1))
                .contractEndDate(LocalDate.of(2026, 12, 31))
                .depositBalance(new BigDecimal("5000000"))
                .status(StreetAgentProfileStatus.ACTIVE.getCode())
                .createdAt(LocalDateTime.of(2026, 6, 17, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 6, 17, 10, 0))
                .createdBy("operator")
                .lastModifiedBy("operator")
                .build();
    }
}
