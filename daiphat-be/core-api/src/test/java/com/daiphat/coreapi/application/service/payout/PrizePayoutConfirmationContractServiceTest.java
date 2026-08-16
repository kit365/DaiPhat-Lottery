package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.request.payout.PreviewPrizePayoutConfirmationContractRequest;
import com.daiphat.coreapi.application.port.out.contract.ContractRepositoryPort;
import com.daiphat.coreapi.application.port.out.document.ContractPdfRendererPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.infrastructure.adapter.out.document.ThymeleafPrizePayoutConfirmationContractHtmlRenderer;
import com.daiphat.coreapi.infrastructure.config.data.ContractSeedCatalog;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.shared.time.VietnamClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PrizePayoutConfirmationContractService")
class PrizePayoutConfirmationContractServiceTest {

    @Mock
    private PrizePayoutEligibilityService prizePayoutEligibilityService;
    @Mock
    private PrizePayoutCalculationService prizePayoutCalculationService;
    @Mock
    private PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    @Mock
    private SystemConfigRepositoryPort systemConfigRepositoryPort;
    @Mock
    private ContractRepositoryPort contractRepositoryPort;
    @Mock
    private ContractPdfRendererPort contractPdfRendererPort;

    private PrizePayoutConfirmationContractService service;

    @BeforeEach
    void setUp() {
        service = new PrizePayoutConfirmationContractService(
                prizePayoutEligibilityService,
                prizePayoutCalculationService,
                prizePayoutRequestRepositoryPort,
                systemConfigRepositoryPort,
                contractRepositoryPort,
                new ThymeleafPrizePayoutConfirmationContractHtmlRenderer(templateEngine()),
                contractPdfRendererPort,
                new VietnamClock(Clock.fixed(Instant.parse("2026-08-15T03:00:00Z"), ZoneOffset.UTC))
        );
    }

    @Test
    @DisplayName("sinh PDF từ vé trúng, người nhận và cấu hình trả thưởng hiện hành")
    void generatePreviewPdf_usesTicketsAndPayoutSettings() {
        OrderEntity order = new OrderEntity();
        order.setOrderCode("DH-20260815-0001");
        order.setPhone("0901234567");

        LotteryTicketSerialEntity serial = new LotteryTicketSerialEntity();
        serial.setId(10L);
        serial.setSerialNumber("S800049");

        OrderDetailEntity detail = new OrderDetailEntity();
        detail.setId(20L);
        detail.setOrder(order);
        detail.setLotteryTicketSerial(serial);

        when(prizePayoutEligibilityService.resolveDetail(20L, null)).thenReturn(detail);
        doNothing().when(prizePayoutEligibilityService).validateStaffInPersonCreate(detail, serial);
        when(prizePayoutEligibilityService.resolvePrizeMatch(detail, serial)).thenReturn(
                new PrizePayoutEligibilityService.PrizeMatchContext(
                        TicketDrawResultStatus.WON,
                        "DB",
                        "Đặc biệt",
                        new BigDecimal("5000000"),
                        "123456",
                        "456",
                        "LAST",
                        3));
        when(prizePayoutCalculationService.calculate(new BigDecimal("5000000"))).thenReturn(
                new PrizePayoutCalculationService.PrizePayoutBreakdown(
                        new BigDecimal("5000000.00"),
                        BigDecimal.ZERO,
                        new BigDecimal("50000.00"),
                        new BigDecimal("4950000.00")));
        when(prizePayoutCalculationService.loadSettings()).thenReturn(
                new PrizePayoutCalculationService.PrizePayoutCalcSettings(
                        new BigDecimal("10000000"),
                        new BigDecimal("10000000"),
                        new BigDecimal("0.10"),
                        List.of(new PrizePayoutCalculationService.CommissionTier(
                                new BigDecimal("10000000"), new BigDecimal("0.01")))));
        when(systemConfigRepositoryPort.findActiveByConfigKey(anyString())).thenReturn(Optional.empty());
        when(contractRepositoryPort.findDefaultByType(ContractType.PRIZE_PAYOUT))
                .thenReturn(Optional.of(ContractSeedCatalog.payoutTemplate(1L)));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SITE_LEGAL_NAME.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.SITE_LEGAL_NAME, "Công ty TNHH Đại Phát")));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SITE_TAX_CODE.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.SITE_TAX_CODE, "0312345678")));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.PRIZE_PAYOUT_CONTRACT_ADDITIONAL_TERMS.name()))
                .thenReturn(Optional.of(config(
                        SystemConfigEnum.PRIZE_PAYOUT_CONTRACT_ADDITIONAL_TERMS,
                        "Cam kết nhận thưởng theo đúng chủ sở hữu vé.")));
        byte[] pdf = "%PDF-1.7".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        when(contractPdfRendererPort.renderPdf(anyString())).thenReturn(pdf);

        ContractPdfDocument result = service.generatePreviewPdf(new PreviewPrizePayoutConfirmationContractRequest(
                List.of(20L), "Nguyễn Văn A", "079123456789"));

        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        verify(contractPdfRendererPort).renderPdf(htmlCaptor.capture());
        assertThat(htmlCaptor.getValue())
                .contains("Hợp đồng xác nhận trả thưởng")
                .contains("Công ty TNHH Đại Phát")
                .contains("0312345678")
                .contains("Nguyễn Văn A")
                .contains("079123456789")
                .contains("DH-20260815-0001")
                .contains("S800049")
                .contains("4.950.000 đ")
                .contains("Cam kết nhận thưởng theo đúng chủ sở hữu vé.")
                .contains("Thuế TNCN 10%")
                .doesNotContain("In hợp đồng");
        assertThat(result.content()).isEqualTo(pdf);
        assertThat(result.fileName()).startsWith("hop-dong-xac-nhan-tra-thuong-HD-TT-20260815-");
    }

    @Test
    @DisplayName("từ chối sinh PDF khi thiếu CCCD người nhận")
    void generatePreviewPdf_rejectsIncompleteRecipient() {
        assertThatThrownBy(() -> service.generatePreviewPdf(
                new PreviewPrizePayoutConfirmationContractRequest(List.of(20L), "Nguyễn Văn A", "123")))
                .isInstanceOf(DomainException.class)
                .satisfies(error -> assertThat(((DomainException) error).getErrorCode())
                        .isEqualTo(ErrorCode.PRIZE_PAYOUT_CONTRACT_INCOMPLETE));
        verify(contractPdfRendererPort, never()).renderPdf(any());
    }

    @Test
    @DisplayName("từ chối in hợp đồng khi không tìm thấy yêu cầu trả thưởng")
    void generatePdfForRequest_notFound() {
        when(prizePayoutRequestRepositoryPort.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.generatePdfForRequest(99L))
                .isInstanceOf(DomainException.class)
                .satisfies(error -> assertThat(((DomainException) error).getErrorCode())
                        .isEqualTo(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
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
