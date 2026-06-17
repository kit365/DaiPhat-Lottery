package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.application.mapper.streetagent.StreetAgentProfileApplicationMapper;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StreetAgentProfileService Unit Tests")
class StreetAgentProfileServiceTest {

    private static final String FIRST_NAME = "Nguyen";
    private static final String LAST_NAME = "Van A";
    private static final String PHONE = "0901234567";
    private static final String CCCD = "079123456789";

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

    @Test
    @DisplayName("create: tạo hồ sơ thành công")
    void create_success() {
        CreateStreetAgentProfileRequest request = buildRequest(
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 12, 31)
        );
        StreetAgentProfileModel model = buildModel();
        StreetAgentProfileResponse response = StreetAgentProfileResponse.builder()
                .id(1L)
                .firstName(FIRST_NAME)
                .lastName(LAST_NAME)
                .phone(PHONE)
                .cccd(CCCD)
                .status(StreetAgentProfileStatus.ACTIVE.getCode())
                .build();

        when(streetAgentProfileRepositoryPort.existsByPhone(PHONE)).thenReturn(false);
        when(streetAgentProfileRepositoryPort.existsByCccd(CCCD)).thenReturn(false);
        when(streetAgentProfileApplicationMapper.toModel(request)).thenReturn(model);
        when(streetAgentProfileRepositoryPort.save(model)).thenReturn(model);
        when(streetAgentProfileApplicationMapper.toResponse(model)).thenReturn(response);

        StreetAgentProfileResponse result = streetAgentProfileService.create(request);

        assertThat(result.id()).isEqualTo(1L);
        assertThat(result.phone()).isEqualTo(PHONE);
        verify(streetAgentProfileRepositoryPort).save(model);
    }

    @Test
    @DisplayName("create: số điện thoại đã tồn tại")
    void create_phoneExisted() {
        CreateStreetAgentProfileRequest request = buildRequest(null, null);
        when(streetAgentProfileRepositoryPort.existsByPhone(PHONE)).thenReturn(true);

        assertThatThrownBy(() -> streetAgentProfileService.create(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_PHONE_EXISTED);

        verify(streetAgentProfileRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("create: CCCD đã tồn tại")
    void create_cccdExisted() {
        CreateStreetAgentProfileRequest request = buildRequest(null, null);
        when(streetAgentProfileRepositoryPort.existsByPhone(PHONE)).thenReturn(false);
        when(streetAgentProfileRepositoryPort.existsByCccd(CCCD)).thenReturn(true);

        assertThatThrownBy(() -> streetAgentProfileService.create(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_CCCD_EXISTED);

        verify(streetAgentProfileRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("create: ngày kết thúc hợp đồng trước ngày bắt đầu")
    void create_invalidContractDate() {
        CreateStreetAgentProfileRequest request = buildRequest(
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 1, 1)
        );
        when(streetAgentProfileRepositoryPort.existsByPhone(PHONE)).thenReturn(false);
        when(streetAgentProfileRepositoryPort.existsByCccd(CCCD)).thenReturn(false);

        assertThatThrownBy(() -> streetAgentProfileService.create(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_INVALID_CONTRACT_DATE);

        verify(streetAgentProfileRepositoryPort, never()).save(any());
    }

    private CreateStreetAgentProfileRequest buildRequest(LocalDate startDate, LocalDate endDate) {
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
                startDate,
                endDate,
                BigDecimal.ZERO,
                "ACTIVE"
        );
    }

    private StreetAgentProfileModel buildModel() {
        return StreetAgentProfileModel.builder()
                .firstName(FIRST_NAME)
                .lastName(LAST_NAME)
                .phone(PHONE)
                .cccd(CCCD)
                .contactAddress("123 Nguyen Hue")
                .contactProvince("Ho Chi Minh")
                .coverageArea("Quan 1, Quan 3")
                .commissionRate(new BigDecimal("0.05"))
                .depositBalance(BigDecimal.ZERO)
                .status(StreetAgentProfileStatus.ACTIVE)
                .build();
    }
}
