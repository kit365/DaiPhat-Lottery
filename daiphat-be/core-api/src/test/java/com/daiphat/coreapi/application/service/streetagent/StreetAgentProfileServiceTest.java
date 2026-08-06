package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.UpdateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.mapper.streetagent.StreetAgentProfileApplicationMapper;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentProfileServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.shared.util.StatusCountKeys;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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

    @Mock
    private StoragePort storagePort;

    private StreetAgentProfileServicePort streetAgentProfileService;

    @BeforeEach
    void setUp() {
        streetAgentProfileService = new StreetAgentProfileService(
                streetAgentProfileRepositoryPort,
                streetAgentProfileApplicationMapper,
                storagePort
        );
    }

    @Nested
    @DisplayName("Danh sách hồ sơ")
    class GetAll {

        @Test
        @DisplayName("trả về danh sách phân trang và statusCounts")
        void getAll_returnsPagedListWithStatusCounts() {
            StreetAgentProfileModel saved = buildSavedModel();
            StreetAgentProfileResponse response = buildResponse();
            Page<StreetAgentProfileModel> profilePage = new PageImpl<>(List.of(saved));

            when(streetAgentProfileRepositoryPort.findAll(any(Pageable.class), isNull(), eq(List.of()), eq(List.of())))
                    .thenReturn(profilePage);
            when(streetAgentProfileRepositoryPort.countAll(isNull(), eq(List.of()))).thenReturn(2L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.ACTIVE, null, List.of()))
                    .thenReturn(1L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.INACTIVE, null, List.of()))
                    .thenReturn(1L);
            when(streetAgentProfileRepositoryPort.countByStatus(StreetAgentProfileStatus.PENDING, null, List.of()))
                    .thenReturn(0L);
            when(streetAgentProfileApplicationMapper.toResponse(saved)).thenReturn(response);

            PageResponse<StreetAgentProfileResponse> result =
                    streetAgentProfileService.getAll(1, 10, null, null, null);

            assertThat(result.getRecordList()).hasSize(1);
            assertThat(result.getRecordList().getFirst().id()).isEqualTo(PROFILE_ID);
            assertThat(result.getRecordList().getFirst().phone()).isEqualTo(PHONE);
            assertThat(result.getPagination().getTotalRecords()).isEqualTo(1L);
            assertThat(result.getPagination().getCurrentPage()).isEqualTo(1);
            assertThat(result.getPagination().getLimit()).isEqualTo(10);
            assertThat(result.getStatusCounts())
                    .containsEntry(StatusCountKeys.ALL, 2L)
                    .containsEntry(StreetAgentProfileStatus.ACTIVE.getCode(), 1L)
                    .containsEntry(StreetAgentProfileStatus.INACTIVE.getCode(), 1L);

            verify(streetAgentProfileRepositoryPort).findAll(any(Pageable.class), isNull(), eq(List.of()), eq(List.of()));
            verify(streetAgentProfileApplicationMapper).toResponse(saved);
        }

        @Test
        @DisplayName("tìm kiếm theo từ khóa")
        void getAll_withSearch() {
            String search = "Van A";
            Page<StreetAgentProfileModel> emptyPage = new PageImpl<>(List.of());

            when(streetAgentProfileRepositoryPort.findAll(any(Pageable.class), eq(search), eq(List.of()), eq(List.of())))
                    .thenReturn(emptyPage);
            when(streetAgentProfileRepositoryPort.countAll(search, List.of())).thenReturn(0L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.ACTIVE, search, List.of()))
                    .thenReturn(0L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.INACTIVE, search, List.of()))
                    .thenReturn(0L);
            when(streetAgentProfileRepositoryPort.countByStatus(StreetAgentProfileStatus.PENDING, search, List.of()))
                    .thenReturn(0L);

            PageResponse<StreetAgentProfileResponse> result =
                    streetAgentProfileService.getAll(1, 10, search, null, null);

            assertThat(result.getRecordList()).isEmpty();
            assertThat(result.getStatusCounts()).containsEntry(StatusCountKeys.ALL, 0L);
            verify(streetAgentProfileRepositoryPort).findAll(any(Pageable.class), eq(search), eq(List.of()), eq(List.of()));
        }

        @Test
        @DisplayName("lọc theo trạng thái ACTIVE")
        void getAll_withActiveStatusFilter() {
            Page<StreetAgentProfileModel> profilePage = new PageImpl<>(List.of(buildSavedModel()));

            when(streetAgentProfileRepositoryPort.findAll(
                    any(Pageable.class),
                    isNull(),
                    eq(List.of(StreetAgentProfileStatus.ACTIVE)),
                    eq(List.of())))
                    .thenReturn(profilePage);
            when(streetAgentProfileRepositoryPort.countAll(isNull(), eq(List.of()))).thenReturn(1L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.ACTIVE, null, List.of()))
                    .thenReturn(1L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.INACTIVE, null, List.of()))
                    .thenReturn(0L);
            when(streetAgentProfileRepositoryPort.countByStatus(StreetAgentProfileStatus.PENDING, null, List.of()))
                    .thenReturn(0L);
            when(streetAgentProfileApplicationMapper.toResponse(any())).thenReturn(buildResponse());

            PageResponse<StreetAgentProfileResponse> result =
                    streetAgentProfileService.getAll(1, 10, null, "ACTIVE", null);

            assertThat(result.getRecordList()).hasSize(1);
            verify(streetAgentProfileRepositoryPort).findAll(
                    any(Pageable.class),
                    isNull(),
                    eq(List.of(StreetAgentProfileStatus.ACTIVE)),
                    eq(List.of()));
        }

        @Test
        @DisplayName("lọc theo trạng thái INACTIVE")
        void getAll_withInactiveStatusFilter() {
            StreetAgentProfileModel inactive = buildSavedModel();
            inactive.setStatus(StreetAgentProfileStatus.INACTIVE);
            Page<StreetAgentProfileModel> profilePage = new PageImpl<>(List.of(inactive));

            when(streetAgentProfileRepositoryPort.findAll(
                    any(Pageable.class),
                    isNull(),
                    eq(List.of(StreetAgentProfileStatus.INACTIVE)),
                    eq(List.of())))
                    .thenReturn(profilePage);
            when(streetAgentProfileRepositoryPort.countAll(isNull(), eq(List.of()))).thenReturn(1L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.ACTIVE, null, List.of()))
                    .thenReturn(0L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.INACTIVE, null, List.of()))
                    .thenReturn(1L);
            when(streetAgentProfileRepositoryPort.countByStatus(StreetAgentProfileStatus.PENDING, null, List.of()))
                    .thenReturn(0L);
            when(streetAgentProfileApplicationMapper.toResponse(inactive)).thenReturn(
                    StreetAgentProfileResponse.builder()
                            .id(PROFILE_ID)
                            .status(StreetAgentProfileStatus.INACTIVE.getCode())
                            .build()
            );

            PageResponse<StreetAgentProfileResponse> result =
                    streetAgentProfileService.getAll(1, 10, null, "INACTIVE", null);

            assertThat(result.getRecordList()).hasSize(1);
            assertThat(result.getRecordList().getFirst().status()).isEqualTo("INACTIVE");
        }

        @Test
        @DisplayName("bỏ qua filter khi status = ALL hoặc không hợp lệ")
        void getAll_ignoresAllOrInvalidStatusFilter() {
            Page<StreetAgentProfileModel> emptyPage = new PageImpl<>(List.of());

            when(streetAgentProfileRepositoryPort.findAll(any(Pageable.class), isNull(), eq(List.of()), eq(List.of())))
                    .thenReturn(emptyPage);
            when(streetAgentProfileRepositoryPort.countAll(isNull(), eq(List.of()))).thenReturn(0L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.ACTIVE, null, List.of()))
                    .thenReturn(0L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.INACTIVE, null, List.of()))
                    .thenReturn(0L);
            when(streetAgentProfileRepositoryPort.countByStatus(StreetAgentProfileStatus.PENDING, null, List.of()))
                    .thenReturn(0L);

            streetAgentProfileService.getAll(1, 10, null, "ALL", null);
            streetAgentProfileService.getAll(1, 10, null, "UNKNOWN", null);

            verify(streetAgentProfileRepositoryPort, org.mockito.Mockito.times(2))
                    .findAll(any(Pageable.class), isNull(), eq(List.of()), eq(List.of()));
        }

        @Test
        @DisplayName("lọc theo tỉnh/thành liên hệ")
        void getAll_withContactProvinceFilter() {
            StreetAgentProfileModel profile = buildSavedModel();
            profile.setContactProvince("Đắk Lắk");
            Page<StreetAgentProfileModel> profilePage = new PageImpl<>(List.of(profile));

            when(streetAgentProfileRepositoryPort.findAll(
                    any(Pageable.class),
                    isNull(),
                    eq(List.of()),
                    eq(List.of("Đắk Lắk"))))
                    .thenReturn(profilePage);
            when(streetAgentProfileRepositoryPort.countAll(isNull(), eq(List.of("Đắk Lắk")))).thenReturn(1L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.ACTIVE, null, List.of("Đắk Lắk")))
                    .thenReturn(1L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.INACTIVE, null, List.of("Đắk Lắk")))
                    .thenReturn(0L);
            when(streetAgentProfileRepositoryPort.countByStatus(
                    StreetAgentProfileStatus.PENDING, null, List.of("Đắk Lắk")))
                    .thenReturn(0L);
            when(streetAgentProfileApplicationMapper.toResponse(profile)).thenReturn(buildResponse());

            PageResponse<StreetAgentProfileResponse> result =
                    streetAgentProfileService.getAll(1, 10, null, null, "Đắk Lắk");

            assertThat(result.getRecordList()).hasSize(1);
            verify(streetAgentProfileRepositoryPort).findAll(
                    any(Pageable.class),
                    isNull(),
                    eq(List.of()),
                    eq(List.of("Đắk Lắk")));
        }
    }

    @Nested
    @DisplayName("Chi tiết hồ sơ")
    class GetById {

        @Test
        @DisplayName("lấy chi tiết hồ sơ thành công")
        void getById_success() {
            StreetAgentProfileModel saved = buildSavedModel();
            StreetAgentProfileResponse response = buildResponse();

            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(saved));
            when(streetAgentProfileApplicationMapper.toResponse(saved)).thenReturn(response);

            StreetAgentProfileResponse result = streetAgentProfileService.getById(PROFILE_ID);

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
            assertThat(result.createdBy()).isEqualTo("operator");

            verify(streetAgentProfileRepositoryPort).findById(PROFILE_ID);
            verify(streetAgentProfileApplicationMapper).toResponse(saved);
        }

        @Test
        @DisplayName("không tìm thấy hồ sơ")
        void getById_notFound() {
            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> streetAgentProfileService.getById(PROFILE_ID))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> assertThat(((DomainException) ex).getErrorCode())
                            .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));

            verifyNoInteractions(streetAgentProfileApplicationMapper);
        }
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
                    new BigDecimal("5000000")
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
            CreateStreetAgentProfileRequest request = buildRequest(null, null, null);
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
        @DisplayName("chưa đủ hợp đồng thì tạo với trạng thái PENDING")
        void create_pendingWithoutCompleteContract() {
            CreateStreetAgentProfileRequest request = buildRequest(
                    LocalDate.of(2026, 3, 1),
                    null,
                    BigDecimal.ZERO
            );
            StreetAgentProfileModel model = buildModel();
            model.setStatus(StreetAgentProfileStatus.INACTIVE);
            model.setContractStartDate(LocalDate.of(2026, 3, 1));
            model.setContractEndDate(null);

            stubUniqueConstraintsPass();
            when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(model);
            when(streetAgentProfileRepositoryPort.save(any())).thenReturn(buildSavedModel());
            when(streetAgentProfileApplicationMapper.toResponse(any())).thenReturn(buildResponse());

            streetAgentProfileService.create(request);

            ArgumentCaptor<StreetAgentProfileModel> captor =
                    ArgumentCaptor.forClass(StreetAgentProfileModel.class);
            verify(streetAgentProfileRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().getStatus()).isEqualTo(StreetAgentProfileStatus.PENDING);
        }

        @Test
        @DisplayName("hồ sơ có cọc legacy chưa đối soát phải PENDING dù hợp đồng còn hiệu lực")
        void create_pendingWhenLegacyDepositIsStillHeld() {
            CreateStreetAgentProfileRequest request = buildCompleteContractRequest(new BigDecimal("1"));
            StreetAgentProfileModel model = buildEligibleModel(BigDecimal.ONE);

            stubUniqueConstraintsPass();
            when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(model);
            when(streetAgentProfileRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(streetAgentProfileApplicationMapper.toResponse(any())).thenReturn(buildResponse());

            streetAgentProfileService.create(request);

            ArgumentCaptor<StreetAgentProfileModel> captor =
                    ArgumentCaptor.forClass(StreetAgentProfileModel.class);
            verify(streetAgentProfileRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().getStatus()).isEqualTo(StreetAgentProfileStatus.PENDING);
        }

        @Test
        @DisplayName("đủ điều kiện HĐ nhưng chưa có bản ký thì vẫn PENDING")
        void create_pendingWhenSignedContractDocumentIsMissing() {
            CreateStreetAgentProfileRequest request = buildCompleteContractRequest(BigDecimal.ZERO);
            StreetAgentProfileModel model = buildEligibleModel(BigDecimal.ZERO);
            model.setContractDocumentUrl(null);

            stubUniqueConstraintsPass();
            when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(model);
            when(streetAgentProfileRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(streetAgentProfileApplicationMapper.toResponse(any())).thenReturn(buildResponse());

            streetAgentProfileService.create(request);

            ArgumentCaptor<StreetAgentProfileModel> captor =
                    ArgumentCaptor.forClass(StreetAgentProfileModel.class);
            verify(streetAgentProfileRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().getStatus()).isEqualTo(StreetAgentProfileStatus.PENDING);
        }

        @Test
        @DisplayName("tự sinh mã hợp đồng khi nhân viên chỉ nhập điều kiện nhận vé")
        void create_generatesContractCodeWhenContractTermsAreComplete() {
            CreateStreetAgentProfileRequest request = new CreateStreetAgentProfileRequest(
                    FIRST_NAME, LAST_NAME, PHONE, CCCD, IMAGE_URL,
                    "123 Nguyen Hue", "Ho Chi Minh", "Quan 1, Quan 3",
                    new BigDecimal("0.05"), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
                    BigDecimal.ZERO, null, null, 100
            );
            StreetAgentProfileModel model = buildEligibleModel(BigDecimal.ZERO);
            model.setContractCode(null);
            model.setContractDocumentUrl(null);

            stubUniqueConstraintsPass();
            when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(model);
            when(streetAgentProfileRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
            when(streetAgentProfileApplicationMapper.toResponse(any())).thenReturn(buildResponse());

            streetAgentProfileService.create(request);

            ArgumentCaptor<StreetAgentProfileModel> captor =
                    ArgumentCaptor.forClass(StreetAgentProfileModel.class);
            verify(streetAgentProfileRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().getContractCode()).startsWith("HD-CTV-");
            assertThat(captor.getValue().getStatus()).isEqualTo(StreetAgentProfileStatus.PENDING);
        }

        @Test
        @DisplayName("ngày bắt đầu và kết thúc trùng nhau")
        void create_withSameContractDates() {
            LocalDate sameDate = LocalDate.of(2026, 6, 1);
            CreateStreetAgentProfileRequest request = buildRequest(sameDate, sameDate, BigDecimal.ZERO);

            stubUniqueConstraintsPass();
            when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(buildModel());
            when(streetAgentProfileRepositoryPort.save(any())).thenReturn(buildSavedModel());
            when(streetAgentProfileApplicationMapper.toResponse(any())).thenReturn(buildResponse());

            assertThat(streetAgentProfileService.create(request).id()).isEqualTo(PROFILE_ID);
        }

        @Test
        @DisplayName("không có thông tin hợp đồng")
        void create_withoutContractDates() {
            CreateStreetAgentProfileRequest request = buildRequest(null, null, BigDecimal.ZERO);

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
            CreateStreetAgentProfileRequest request = buildRequest(null, null, BigDecimal.ZERO);
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
            CreateStreetAgentProfileRequest request = buildRequest(null, null, BigDecimal.ZERO);
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
                    BigDecimal.ZERO
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
    @DisplayName("Upload bản hợp đồng đã ký")
    class UploadSignedContract {
        @Test
        @DisplayName("sau khi upload bản ký sẽ đồng bộ status sang ACTIVE nếu đủ điều kiện")
        void upload_syncsStatusToActiveWhenEligible() {
            StreetAgentProfileModel existing = buildEligibleModel(BigDecimal.ZERO);
            existing.setId(PROFILE_ID);
            existing.setContractDocumentUrl(null);
            existing.setStatus(StreetAgentProfileStatus.PENDING);

            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(existing));
            when(storagePort.upload(any())).thenReturn(
                    new com.daiphat.coreapi.application.dto.storage.StorageResult(
                            "signed/1", "https://cdn.example.com/contracts/signed.pdf"));
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(existing);
            when(streetAgentProfileApplicationMapper.toResponse(existing)).thenReturn(buildResponse());

            streetAgentProfileService.uploadSignedContractDocument(
                    PROFILE_ID,
                    new com.daiphat.coreapi.application.dto.storage.UploadRequest(
                            new byte[] {1, 2, 3},
                            "signed.pdf",
                            "application/pdf",
                            "street-agent-contracts"));

            assertThat(existing.getContractDocumentUrl())
                    .isEqualTo("https://cdn.example.com/contracts/signed.pdf");
            assertThat(existing.getStatus()).isEqualTo(StreetAgentProfileStatus.ACTIVE);
            verify(streetAgentProfileRepositoryPort).save(existing);
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
            saved.setDepositAdjustmentReason("Tăng ký quỹ");
            StreetAgentProfileResponse response = StreetAgentProfileResponse.builder()
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
                    .contractStartDate(LocalDate.of(2026, 2, 1))
                    .contractEndDate(LocalDate.of(2026, 11, 30))
                    .depositBalance(new BigDecimal("7000000"))
                    .depositAdjustmentReason("Tăng ký quỹ")
                    .status(StreetAgentProfileStatus.INACTIVE.getCode())
                    .build();

            stubUpdateUniqueConstraintsPass(existing);
            doAnswer(invocation -> {
                StreetAgentProfileModel model = invocation.getArgument(0);
                UpdateStreetAgentProfileRequest req = invocation.getArgument(1);
                model.setFirstName(req.firstName());
                model.setLastName(req.lastName());
                model.setStatus(StreetAgentProfileStatus.INACTIVE);
                model.setDepositAdjustmentReason(req.depositAdjustmentReason());
                model.setContractStartDate(req.contractStartDate());
                model.setContractEndDate(req.contractEndDate());
                return null;
            }).when(streetAgentProfileApplicationMapper).updateModel(eq(existing), eq(request));
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(saved);
            when(streetAgentProfileApplicationMapper.toResponse(saved)).thenReturn(response);

            StreetAgentProfileResponse result = streetAgentProfileService.update(PROFILE_ID, request);

            assertThat(result.id()).isEqualTo(PROFILE_ID);
            assertThat(result.firstName()).isEqualTo(FIRST_NAME);
            assertThat(result.lastName()).isEqualTo(LAST_NAME);
            assertThat(result.phone()).isEqualTo(PHONE);
            assertThat(result.cccd()).isEqualTo(CCCD);
            assertThat(result.depositBalance()).isEqualByComparingTo("7000000");
            assertThat(result.depositAdjustmentReason()).isEqualTo("Tăng ký quỹ");
            assertThat(result.status()).isEqualTo("INACTIVE");
            verify(streetAgentProfileRepositoryPort).findById(PROFILE_ID);
            verify(streetAgentProfileRepositoryPort).existsByPhoneAndIdNot(PHONE, PROFILE_ID);
            verify(streetAgentProfileRepositoryPort).existsByCccdAndIdNot(CCCD, PROFILE_ID);
            verify(streetAgentProfileApplicationMapper).updateModel(existing, request);
            verify(streetAgentProfileRepositoryPort).save(existing);
            verify(streetAgentProfileApplicationMapper).toResponse(saved);
        }

        @Test
        @DisplayName("cập nhật số dư ký quỹ khi có giá trị mới")
        void update_setsDepositBalanceWhenProvided() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(
                    null,
                    null,
                    new BigDecimal("8000000"),
                    "Điều chỉnh ký quỹ",
                    "ACTIVE"
            );
            StreetAgentProfileModel existing = buildSavedModel();

            stubUpdateUniqueConstraintsPass(existing);
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(existing);
            when(streetAgentProfileApplicationMapper.toResponse(existing)).thenReturn(buildResponse());

            streetAgentProfileService.update(PROFILE_ID, request);

            assertThat(existing.getDepositBalance()).isEqualByComparingTo("8000000");
            verify(streetAgentProfileApplicationMapper).updateModel(existing, request);
            verify(streetAgentProfileRepositoryPort).save(existing);
        }

        @Test
        @DisplayName("đối soát cọc legacy về 0 sẽ kích hoạt lại hồ sơ đủ hợp đồng")
        void update_activatesEligibleProfileAfterLegacyDepositIsReconciled() {
            UpdateStreetAgentProfileRequest request = buildCompleteContractUpdateRequest(BigDecimal.ZERO, "ACTIVE");
            StreetAgentProfileModel existing = buildEligibleModel(new BigDecimal("500000"));
            existing.setStatus(StreetAgentProfileStatus.PENDING);

            stubUpdateUniqueConstraintsPass(existing);
            doAnswer(invocation -> {
                StreetAgentProfileModel target = invocation.getArgument(0);
                UpdateStreetAgentProfileRequest source = invocation.getArgument(1);
                target.setContractCode(source.contractCode());
                target.setContractStartDate(source.contractStartDate());
                target.setContractEndDate(source.contractEndDate());
                target.setDailyTicketCap(source.dailyTicketCap());
                target.setStatus(StreetAgentProfileStatus.fromCode(source.status()));
                return null;
            }).when(streetAgentProfileApplicationMapper).updateModel(eq(existing), eq(request));
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(existing);
            when(streetAgentProfileApplicationMapper.toResponse(existing)).thenReturn(buildResponse());

            streetAgentProfileService.update(PROFILE_ID, request);

            assertThat(existing.getDepositBalance()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(existing.getStatus()).isEqualTo(StreetAgentProfileStatus.ACTIVE);
        }

        @Test
        @DisplayName("giữ nguyên depositBalance khi null")
        void update_keepsDepositBalanceWhenNull() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(null, null, null, null, "ACTIVE");
            StreetAgentProfileModel existing = buildSavedModel();

            stubUpdateUniqueConstraintsPass(existing);
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(existing);
            when(streetAgentProfileApplicationMapper.toResponse(existing)).thenReturn(buildResponse());

            streetAgentProfileService.update(PROFILE_ID, request);

            assertThat(existing.getDepositBalance()).isEqualByComparingTo("5000000");
            verify(streetAgentProfileRepositoryPort).save(existing);
        }

        @Test
        @DisplayName("chỉ có ngày bắt đầu hợp đồng")
        void update_withOnlyContractStartDate() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(
                    LocalDate.of(2026, 3, 1),
                    null,
                    BigDecimal.ZERO,
                    null,
                    "INACTIVE"
            );
            StreetAgentProfileModel existing = buildSavedModel();

            stubUpdateUniqueConstraintsPass(existing);
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(existing);
            when(streetAgentProfileApplicationMapper.toResponse(existing)).thenReturn(buildResponse());

            streetAgentProfileService.update(PROFILE_ID, request);

            verify(streetAgentProfileApplicationMapper).updateModel(existing, request);
            verify(streetAgentProfileRepositoryPort).save(existing);
        }

        @Test
        @DisplayName("ngày bắt đầu và kết thúc trùng nhau")
        void update_withSameContractDates() {
            LocalDate sameDate = LocalDate.of(2026, 6, 1);
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(
                    sameDate,
                    sameDate,
                    BigDecimal.ZERO,
                    null,
                    "ACTIVE"
            );
            StreetAgentProfileModel existing = buildSavedModel();

            stubUpdateUniqueConstraintsPass(existing);
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(existing);
            when(streetAgentProfileApplicationMapper.toResponse(existing)).thenReturn(buildResponse());

            assertThat(streetAgentProfileService.update(PROFILE_ID, request).id()).isEqualTo(PROFILE_ID);
        }

        @Test
        @DisplayName("không có thông tin hợp đồng")
        void update_withoutContractDates() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(null, null, BigDecimal.ZERO, null, "ACTIVE");
            StreetAgentProfileModel existing = buildSavedModel();

            stubUpdateUniqueConstraintsPass(existing);
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(existing);
            when(streetAgentProfileApplicationMapper.toResponse(existing)).thenReturn(buildResponse());

            assertThat(streetAgentProfileService.update(PROFILE_ID, request).id()).isEqualTo(PROFILE_ID);
        }

        @Test
        @DisplayName("cho phép giữ nguyên số điện thoại và CCCD của chính hồ sơ")
        void update_allowsSamePhoneAndCccdForSameProfile() {
            UpdateStreetAgentProfileRequest request = buildUpdateRequest(null, null, null, null, "ACTIVE");
            StreetAgentProfileModel existing = buildSavedModel();

            stubUpdateUniqueConstraintsPass(existing);
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(existing);
            when(streetAgentProfileApplicationMapper.toResponse(existing)).thenReturn(buildResponse());

            streetAgentProfileService.update(PROFILE_ID, request);

            verify(streetAgentProfileRepositoryPort).existsByPhoneAndIdNot(PHONE, PROFILE_ID);
            verify(streetAgentProfileRepositoryPort).existsByCccdAndIdNot(CCCD, PROFILE_ID);
            verify(streetAgentProfileRepositoryPort).save(existing);
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

            verify(streetAgentProfileRepositoryPort, never()).existsByPhoneAndIdNot(any(), any());
            verify(streetAgentProfileRepositoryPort, never()).existsByCccdAndIdNot(any(), any());
            verify(streetAgentProfileApplicationMapper, never()).updateModel(any(), any());
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

            verify(streetAgentProfileRepositoryPort, never()).existsByCccdAndIdNot(any(), any());
            verify(streetAgentProfileApplicationMapper, never()).updateModel(any(), any());
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

            verify(streetAgentProfileApplicationMapper, never()).updateModel(any(), any());
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

            verify(streetAgentProfileApplicationMapper, never()).updateModel(any(), any());
            verify(streetAgentProfileRepositoryPort, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Xóa hồ sơ")
    class DeleteSuccess {

        @Test
        @DisplayName("xóa mềm hồ sơ thành công")
        void delete_success() {
            StreetAgentProfileModel existing = buildSavedModel();
            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(existing));
            when(streetAgentProfileRepositoryPort.save(existing)).thenReturn(existing);

            streetAgentProfileService.delete(PROFILE_ID);

            ArgumentCaptor<StreetAgentProfileModel> captor =
                    ArgumentCaptor.forClass(StreetAgentProfileModel.class);
            verify(streetAgentProfileRepositoryPort).save(captor.capture());
            assertThat(captor.getValue().isDeleted()).isTrue();
        }

        @Test
        @DisplayName("không tìm thấy hồ sơ")
        void delete_notFound() {
            when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> streetAgentProfileService.delete(PROFILE_ID))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> assertThat(((DomainException) ex).getErrorCode())
                            .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));

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

    private void stubUpdateUniqueConstraintsPass(StreetAgentProfileModel existing) {
        when(streetAgentProfileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(existing));
        when(streetAgentProfileRepositoryPort.existsByPhoneAndIdNot(PHONE, PROFILE_ID)).thenReturn(false);
        when(streetAgentProfileRepositoryPort.existsByCccdAndIdNot(CCCD, PROFILE_ID)).thenReturn(false);
    }

    private CreateStreetAgentProfileRequest buildRequest(
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal depositBalance) {
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
                depositBalance
        );
    }

    private CreateStreetAgentProfileRequest buildCompleteContractRequest(BigDecimal depositBalance) {
        return new CreateStreetAgentProfileRequest(
                FIRST_NAME, LAST_NAME, PHONE, CCCD, IMAGE_URL,
                "123 Nguyen Hue", "Ho Chi Minh", "Quan 1, Quan 3",
                new BigDecimal("0.05"), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
                depositBalance, "HD-VENDOR-001", null, 100
        );
    }

    private UpdateStreetAgentProfileRequest buildCompleteContractUpdateRequest(
            BigDecimal depositBalance, String status) {
        return new UpdateStreetAgentProfileRequest(
                FIRST_NAME, LAST_NAME, PHONE, CCCD, IMAGE_URL,
                "123 Nguyen Hue", "Ho Chi Minh", "Quan 1, Quan 3",
                new BigDecimal("0.05"), LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
                depositBalance, "Đối soát cọc legacy", status, "HD-VENDOR-001", null, 100
        );
    }

    private StreetAgentProfileModel buildEligibleModel(BigDecimal depositBalance) {
        StreetAgentProfileModel model = buildModel();
        model.setContractCode("HD-VENDOR-001");
        model.setContractDocumentUrl("https://cdn.example.com/contracts/signed.pdf");
        model.setDailyTicketCap(100);
        model.setDepositBalance(depositBalance);
        return model;
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
