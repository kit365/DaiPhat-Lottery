package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.port.out.document.ContractPdfRendererPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.infrastructure.adapter.out.document.ThymeleafStreetAgentContractHtmlRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("StreetAgentContractService")
class StreetAgentContractServiceTest {

    private static final Long PROFILE_ID = 10L;

    @Mock
    private StreetAgentProfileRepositoryPort profileRepositoryPort;
    @Mock
    private SystemConfigRepositoryPort systemConfigRepositoryPort;
    private SpringTemplateEngine templateEngine;
    @Mock
    private ContractPdfRendererPort contractPdfRendererPort;

    private StreetAgentContractService service;

    @BeforeEach
    void setUp() {
        templateEngine = templateEngine();
        service = new StreetAgentContractService(
                profileRepositoryPort,
                systemConfigRepositoryPort,
                new ThymeleafStreetAgentContractHtmlRenderer(templateEngine),
                contractPdfRendererPort);
    }

    @Test
    @DisplayName("sinh PDF từ profile và cấu hình hiện hành")
    void generatePdf_usesProfileAndSystemSettings() {
        byte[] pdf = "%PDF-1.7".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        when(profileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(completeProfile()));
        when(systemConfigRepositoryPort.findActiveByConfigKey(anyString())).thenReturn(Optional.empty());
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SITE_NAME.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.SITE_NAME, "Đại Phát Lottery")));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SITE_LEGAL_NAME.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.SITE_LEGAL_NAME, "Công ty TNHH Đại Phát")));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SITE_TAX_CODE.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.SITE_TAX_CODE, "0312345678")));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SITE_LEGAL_REPRESENTATIVE.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.SITE_LEGAL_REPRESENTATIVE, "Nguyễn Văn Đại")));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SITE_LEGAL_REPRESENTATIVE_TITLE.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.SITE_LEGAL_REPRESENTATIVE_TITLE, "Giám đốc")));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SITE_CONTRACT_SIGNING_PLACE.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.SITE_CONTRACT_SIGNING_PLACE, "TP. Hồ Chí Minh")));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.VENDOR_DEPOSIT_RATE.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.VENDOR_DEPOSIT_RATE, "0.10")));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.VENDOR_RETURN_CUTOFF.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.VENDOR_RETURN_CUTOFF, "15:00")));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY, "FORFEIT_DEPOSIT")));
        when(contractPdfRendererPort.renderPdf(anyString())).thenReturn(pdf);

        ContractPdfDocument result = service.generatePdf(PROFILE_ID);

        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        verify(contractPdfRendererPort).renderPdf(htmlCaptor.capture());
        assertThat(htmlCaptor.getValue())
                .contains("Đại Phát Lottery")
                .contains("Công ty TNHH Đại Phát")
                .contains("0312345678")
                .contains("Nguyễn Văn Đại")
                .contains("Nguyen Van A")
                .contains("9.000 đ/vé")
                .contains("Tiền cọc = số vé xác nhận bàn giao")
                .contains("phiếu này là phụ lục không tách rời")
                .contains("15:00")
                .doesNotContain("In hợp đồng");
        assertThat(result.content()).isEqualTo(pdf);
        assertThat(result.fileName()).isEqualTo("hop-dong-cong-tac-ban-ve-HD-NBD-2026-001.pdf");
    }

    @Test
    @DisplayName("từ chối sinh PDF khi thiếu điều khoản bắt buộc")
    void generatePdf_rejectsIncompleteContract() {
        StreetAgentProfileModel incomplete = completeProfile();
        incomplete.setContractMaxDailyCap(null);
        when(profileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(incomplete));

        assertThatThrownBy(() -> service.generatePdf(PROFILE_ID))
                .isInstanceOf(DomainException.class)
                .satisfies(error -> assertThat(((DomainException) error).getErrorCode())
                        .isEqualTo(ErrorCode.STREET_AGENT_CONTRACT_INCOMPLETE));

        verify(contractPdfRendererPort, never()).renderPdf(anyString());
    }

    @Test
    @DisplayName("từ chối sinh PDF khi thời hạn hợp đồng bị đảo ngược")
    void generatePdf_rejectsInvertedContractDates() {
        StreetAgentProfileModel profile = completeProfile();
        profile.setContractStartDate(LocalDate.of(2026, 12, 31));
        profile.setContractEndDate(LocalDate.of(2026, 1, 1));
        when(profileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.of(profile));

        assertThatThrownBy(() -> service.generatePdf(PROFILE_ID))
                .isInstanceOf(DomainException.class)
                .satisfies(error -> assertThat(((DomainException) error).getErrorCode())
                        .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_INVALID_CONTRACT_DATE));

        verify(contractPdfRendererPort, never()).renderPdf(anyString());
    }

    @Test
    @DisplayName("trả lỗi không tìm thấy khi hồ sơ không tồn tại")
    void generatePdf_rejectsMissingProfile() {
        when(profileRepositoryPort.findById(PROFILE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generatePdf(PROFILE_ID))
                .isInstanceOf(DomainException.class)
                .satisfies(error -> assertThat(((DomainException) error).getErrorCode())
                        .isEqualTo(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));

        verify(contractPdfRendererPort, never()).renderPdf(anyString());
    }

    private StreetAgentProfileModel completeProfile() {
        return StreetAgentProfileModel.builder()
                .id(PROFILE_ID)
                .firstName("Van A")
                .lastName("Nguyen")
                .phone("0901234567")
                .cccd("079123456789")
                .contactAddress("123 Nguyen Hue")
                .contactProvince("Ho Chi Minh")
                .coverageArea("Quan 1, Quan 3")
                .commissionRate(new BigDecimal("0.10"))
                .contractCode("HD-NBD-2026-001")
                .contractStartDate(LocalDate.of(2026, 1, 1))
                .contractEndDate(LocalDate.of(2026, 12, 31))
                .contractMaxDailyCap(100)
                .build();
    }

    private SystemConfigModel config(SystemConfigEnum key, String value) {
        return SystemConfigModel.builder().configKey(key.name()).configValue(value).isActive(true).build();
    }

    private SpringTemplateEngine templateEngine() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode("HTML");
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        return engine;
    }
}
