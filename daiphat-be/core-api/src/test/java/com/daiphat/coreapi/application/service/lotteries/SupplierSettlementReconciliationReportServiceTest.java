package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementOverviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.document.ContractPdfRendererPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.infrastructure.adapter.out.document.ThymeleafSupplierSettlementReconciliationReportHtmlRenderer;
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
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierSettlementReconciliationReportService")
class SupplierSettlementReconciliationReportServiceTest {

    @Mock
    private SupplierSettlementServicePort supplierSettlementServicePort;
    @Mock
    private SystemConfigRepositoryPort systemConfigRepositoryPort;
    @Mock
    private ContractPdfRendererPort contractPdfRendererPort;

    private SupplierSettlementReconciliationReportService service;

    @BeforeEach
    void setUp() {
        service = new SupplierSettlementReconciliationReportService(
                supplierSettlementServicePort,
                systemConfigRepositoryPort,
                new ThymeleafSupplierSettlementReconciliationReportHtmlRenderer(templateEngine()),
                contractPdfRendererPort,
                new VietnamClock(Clock.fixed(Instant.parse("2026-08-15T03:00:00Z"), ZoneOffset.UTC))
        );
    }

    @Test
    @DisplayName("sinh PDF báo cáo đối soát với số lượng, tiền và từng lô nhập")
    void generatePdf_rendersKeyFigures() {
        when(supplierSettlementServicePort.getOverview(10L)).thenReturn(overview());
        when(systemConfigRepositoryPort.findActiveByConfigKey(anyString())).thenReturn(Optional.empty());
        byte[] pdf = "%PDF-1.7".getBytes(StandardCharsets.US_ASCII);
        when(contractPdfRendererPort.renderPdf(anyString())).thenReturn(pdf);

        ContractPdfDocument result = service.generatePdf(10L);

        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        verify(contractPdfRendererPort).renderPdf(htmlCaptor.capture());
        assertThat(htmlCaptor.getValue())
                .contains("Báo cáo đối soát nhà cung cấp")
                .contains("NCC Miền Nam")
                .contains("DS-20260815-001")
                .contains("IB-001")
                .contains("Vé nhập")
                .contains("Tổng tiền nhập")
                .contains("Chưa thanh toán")
                .contains("Số tiền phải trả NCC");
        assertThat(result.content()).isEqualTo(pdf);
        assertThat(result.fileName()).isEqualTo("bao-cao-doi-soat-DS-20260815-001.pdf");
    }

    @Test
    @DisplayName("từ chối xuất PDF khi chưa đối chiếu số liệu")
    void generatePdf_rejectsMatchingPhase() {
        when(supplierSettlementServicePort.getOverview(10L)).thenReturn(
                SupplierSettlementOverviewResponse.builder()
                        .settlement(SupplierSettlementResponse.builder()
                                .id(10L)
                                .reconciliationPhase(SupplierSettlementReconciliationPhase.MATCHING)
                                .build())
                        .build()
        );

        assertThatThrownBy(() -> service.generatePdf(10L)).isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("PDF kỳ đã thanh toán ghi Đã thanh toán và mục ảnh biên lai")
    void generatePdf_paidStatusIncludesReceiptSection() {
        when(supplierSettlementServicePort.getOverview(10L)).thenReturn(paidOverview());
        when(systemConfigRepositoryPort.findActiveByConfigKey(anyString())).thenReturn(Optional.empty());
        when(contractPdfRendererPort.renderPdf(anyString())).thenReturn("%PDF-1.7".getBytes(StandardCharsets.US_ASCII));

        service.generatePdf(10L);

        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        verify(contractPdfRendererPort).renderPdf(htmlCaptor.capture());
        assertThat(htmlCaptor.getValue())
                .contains("Đã thanh toán")
                .contains("Ảnh biên lai đã thanh toán")
                .doesNotContain("Chưa thanh toán.");
    }

    private SupplierSettlementOverviewResponse paidOverview() {
        return overview(
                SupplierSettlementStatus.COMPLETED,
                "Đã thanh toán",
                SupplierSettlementReconciliationPhase.COMPLETED,
                "Hoàn tất đối soát"
        );
    }

    private SupplierSettlementOverviewResponse overview() {
        return overview(
                SupplierSettlementStatus.OPEN,
                "Đang mở",
                SupplierSettlementReconciliationPhase.RECALCULATED,
                "Đã tính lại"
        );
    }

    private SupplierSettlementOverviewResponse overview(
            SupplierSettlementStatus status,
            String statusLabel,
            SupplierSettlementReconciliationPhase phase,
            String phaseLabel
    ) {
        return SupplierSettlementOverviewResponse.builder()
                .settlement(SupplierSettlementResponse.builder()
                        .id(10L)
                        .supplierName("NCC Miền Nam")
                        .supplierCode("NCC-MN")
                        .supplierSettlementCode("DS-20260815-001")
                        .periodFrom(LocalDate.of(2026, 8, 15))
                        .periodTo(LocalDate.of(2026, 8, 15))
                        .status(status)
                        .statusLabel(statusLabel)
                        .reconciliationPhase(phase)
                        .reconciliationPhaseLabel(phaseLabel)
                        .matchingConfirmedAt(LocalDateTime.of(2026, 8, 15, 10, 0))
                        .systemImportQuantity(100)
                        .actualTicketImportQuantity(100)
                        .systemReturnQuantity(20)
                        .actualReturnTicketQuantity(18)
                        .systemImportValue(new BigDecimal("880000.000"))
                        .actualTicketImportValue(new BigDecimal("880000.000"))
                        .systemReturnValue(new BigDecimal("176000.000"))
                        .actualReturnTicketValue(new BigDecimal("158400.000"))
                        .initialEstimatedSettlementValue(new BigDecimal("704000.000"))
                        .finalSettlementValue(new BigDecimal("721600.000"))
                        .actualPaidAmount(new BigDecimal("721600.000"))
                        .settlementDifferenceAmount(new BigDecimal("17600.000"))
                        .paymentEvidenceUrls(List.of("/uploads/paid.jpg"))
                        .build())
                .importBatches(List.of(ImportBatchResponse.builder()
                        .id(1L)
                        .batchCode("IB-001")
                        .drawDate(LocalDate.of(2026, 8, 15))
                        .status(ImportBatchStatus.IMPORTED)
                        .totalImportedQuantity(100)
                        .totalImportedCostValue(new BigDecimal("880000.000"))
                        .build()))
                .returnBatches(List.of())
                .stationPricing(List.of())
                .adjustments(List.of())
                .build();
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
