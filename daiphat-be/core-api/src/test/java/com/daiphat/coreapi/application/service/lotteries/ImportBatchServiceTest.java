package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchClassificationPreviewRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchClassificationPreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ImportBatchApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotterySupplierServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import com.daiphat.coreapi.shared.util.ImportBatchCodeGenerator;
import com.daiphat.coreapi.shared.util.ImportBatchStationEligibilityResolver;
import com.daiphat.coreapi.shared.util.ImportBatchTypeResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ImportBatchService Unit Tests")
class ImportBatchServiceTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate DRAW_DATE = LocalDate.of(2026, 7, 6);
    private static final UUID OPERATOR_ID = UUID.randomUUID();

    private static final Long SUPPLIER_ID = 5L;

    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock
    private LotteryStationServicePort lotteryStationServicePort;
    @Mock
    private LotterySupplierServicePort lotterySupplierServicePort;
    @Mock
    private ImportBatchApplicationMapper importBatchApplicationMapper;
    @Mock
    private ImportBatchTypeResolver importBatchTypeResolver;
    @Mock
    private ImportBatchStationEligibilityResolver stationEligibilityResolver;
    @Mock
    private ImportBatchCodeGenerator importBatchCodeGenerator;
    @Mock
    private ImportBatchConfigResolver importBatchConfigResolver;
    @Mock
    private Clock clock;

    @InjectMocks
    private ImportBatchService importBatchService;

    private LotteryStationModel activeStation;
    private LotterySupplierModel activeSupplier;

    @BeforeEach
    void setUp() {
        activeStation = LotteryStationModel.builder()
                .id(1L)
                .name("Cà Mau")
                .isActive(true)
                .drawDays(List.of(DayOfWeek.MONDAY))
                .drawTime(LocalTime.of(16, 15))
                .build();
        activeSupplier = LotterySupplierModel.builder()
                .id(SUPPLIER_ID)
                .name("Tổng đại lý Minh Chính")
                .code("MINH_CHINH")
                .isActive(true)
                .build();
        when(lotterySupplierServicePort.getActiveModelById(SUPPLIER_ID)).thenReturn(activeSupplier);
        when(importBatchCodeGenerator.generate(any(), any(), any())).thenReturn("0001_CAMAU_NEW_20260706");
    }

    @Test
    @DisplayName("create is rejected when no active supplier is configured")
    void create_noActiveSupplierConfigured_throws() {
        when(importBatchRepositoryPort.existsByImportedByAndStatus(OPERATOR_ID, ImportBatchStatus.DRAFT))
                .thenReturn(false);
        org.mockito.Mockito.doThrow(new DomainException(ErrorCode.IMPORT_BATCH_NO_SUPPLIER_CONFIGURED))
                .when(lotterySupplierServicePort).ensureActiveSupplierConfigured();

        assertThatThrownBy(() -> importBatchService.create(buildRequest("https://cdn.example/invoice.jpg"), OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_NO_SUPPLIER_CONFIGURED);
    }

    @Test
    @DisplayName("create duplicate station in same request is rejected")
    void create_duplicateStation_throws() {
        when(importBatchRepositoryPort.existsByImportedByAndStatus(OPERATOR_ID, ImportBatchStatus.DRAFT))
                .thenReturn(false);
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));

        CreateImportBatchRequest request = CreateImportBatchRequest.builder()
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .importMode(ImportBatchImportMode.IN_DAY)
                .lines(List.of(
                        buildLine(1L, 10, null),
                        buildLine(1L, 5, null)
                ))
                .build();

        assertThatThrownBy(() -> importBatchService.create(request, OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_DUPLICATE_STATION);
    }

    @Test
    @DisplayName("create NEW line before late window succeeds with invoice")
    void create_newLineBeforeLateWindow_success() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));
        when(importBatchRepositoryPort.existsByImportedByAndStatus(OPERATOR_ID, ImportBatchStatus.DRAFT))
                .thenReturn(false);
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);
        when(importBatchTypeResolver.resolve(1L, DRAW_DATE, activeStation, ImportBatchImportMode.IN_DAY))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(ImportBatchType.NEW, false, List.of()));

        CreateImportBatchRequest request = buildRequest("https://cdn.example/invoice.jpg");
        ImportBatchLineModel lineModel = ImportBatchLineModel.builder()
                .lotteryStationId(1L)
                .declareQuantity(10)
                .importCost(BigDecimal.valueOf(10000))
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .build();

        when(importBatchApplicationMapper.toLineModel(any())).thenReturn(lineModel);

        ImportBatchModel saved = ImportBatchModel.builder()
                .id(10L)
                .drawDate(DRAW_DATE)
                .status(ImportBatchStatus.DRAFT)
                .lines(new ArrayList<>(List.of(lineModel)))
                .build();
        lineModel.setBatchType(ImportBatchType.NEW);

        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenReturn(saved);
        when(importBatchApplicationMapper.toResponse(eq(saved), eq(false), any()))
                .thenReturn(ImportBatchResponse.builder()
                        .id(10L)
                        .lines(List.of(ImportBatchLineResponse.builder()
                                .batchType(ImportBatchType.NEW)
                                .build()))
                        .build());

        ImportBatchResponse response = importBatchService.create(request, OPERATOR_ID);

        assertThat(response.id()).isEqualTo(10L);

        ArgumentCaptor<ImportBatchModel> captor = ArgumentCaptor.forClass(ImportBatchModel.class);
        verify(importBatchRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getLines()).hasSize(1);
        assertThat(captor.getValue().getLines().getFirst().getBatchType()).isEqualTo(ImportBatchType.NEW);
    }

    @Test
    @DisplayName("create SUPPLEMENTARY line does not require invoice")
    void create_supplementaryWithoutInvoice_success() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));
        when(importBatchRepositoryPort.existsByImportedByAndStatus(OPERATOR_ID, ImportBatchStatus.DRAFT))
                .thenReturn(false);
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);
        when(importBatchTypeResolver.resolve(1L, DRAW_DATE, activeStation, ImportBatchImportMode.IN_DAY))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(
                        ImportBatchType.SUPPLEMENTARY, false, List.of()));

        ImportBatchLineModel lineModel = ImportBatchLineModel.builder()
                .lotteryStationId(1L)
                .declareQuantity(10)
                .importCost(BigDecimal.valueOf(10000))
                .build();
        when(importBatchApplicationMapper.toLineModel(any())).thenReturn(lineModel);

        ImportBatchModel saved = ImportBatchModel.builder()
                .id(11L)
                .drawDate(DRAW_DATE)
                .lines(new ArrayList<>(List.of(lineModel)))
                .build();
        lineModel.setBatchType(ImportBatchType.SUPPLEMENTARY);

        when(importBatchRepositoryPort.save(any())).thenReturn(saved);
        when(importBatchApplicationMapper.toResponse(eq(saved), eq(false), any()))
                .thenReturn(ImportBatchResponse.builder().id(11L).build());

        importBatchService.create(buildRequest(null), OPERATOR_ID);

        verify(importBatchRepositoryPort).save(any(ImportBatchModel.class));
    }

    @Test
    @DisplayName("create POST_DRAW_SUPPLEMENT resolves ADJUSTMENT")
    void create_postDrawSupplement_resolvesAdjustment() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 17, 0));
        when(importBatchRepositoryPort.existsByImportedByAndStatus(OPERATOR_ID, ImportBatchStatus.DRAFT))
                .thenReturn(false);
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);
        when(importBatchTypeResolver.resolve(1L, DRAW_DATE, activeStation, ImportBatchImportMode.POST_DRAW_SUPPLEMENT))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(
                        ImportBatchType.ADJUSTMENT, false, List.of()));

        ImportBatchLineModel lineModel = ImportBatchLineModel.builder()
                .lotteryStationId(1L)
                .declareQuantity(10)
                .importCost(BigDecimal.valueOf(10000))
                .build();
        when(importBatchApplicationMapper.toLineModel(any())).thenReturn(lineModel);

        ImportBatchModel saved = ImportBatchModel.builder()
                .id(12L)
                .lines(new ArrayList<>(List.of(lineModel)))
                .build();
        lineModel.setBatchType(ImportBatchType.ADJUSTMENT);

        when(importBatchRepositoryPort.save(any())).thenReturn(saved);
        when(importBatchApplicationMapper.toResponse(eq(saved), eq(false), any()))
                .thenReturn(ImportBatchResponse.builder().id(12L).build());

        CreateImportBatchRequest request = CreateImportBatchRequest.builder()
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .importMode(ImportBatchImportMode.POST_DRAW_SUPPLEMENT)
                .lines(List.of(buildLine(1L, 10, null)))
                .build();

        ImportBatchResponse response = importBatchService.create(request, OPERATOR_ID);

        assertThat(response.id()).isEqualTo(12L);
    }

    @Test
    @DisplayName("create NEW without invoice is rejected")
    void create_newWithoutInvoice_throws() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));
        when(importBatchRepositoryPort.existsByImportedByAndStatus(OPERATOR_ID, ImportBatchStatus.DRAFT))
                .thenReturn(false);
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);
        when(importBatchTypeResolver.resolve(1L, DRAW_DATE, activeStation, ImportBatchImportMode.IN_DAY))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(ImportBatchType.NEW, false, List.of()));

        ImportBatchLineModel lineModel = ImportBatchLineModel.builder()
                .lotteryStationId(1L)
                .declareQuantity(10)
                .importCost(BigDecimal.valueOf(10000))
                .build();
        lineModel.setBatchType(ImportBatchType.NEW);
        when(importBatchApplicationMapper.toLineModel(any())).thenReturn(lineModel);

        assertThatThrownBy(() -> importBatchService.create(buildRequest(null), OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_INVOICE_REQUIRED);
    }

    @Test
    @DisplayName("previewClassification returns resolved type from resolver")
    void previewClassification_returnsResolvedType() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);
        when(importBatchTypeResolver.resolve(1L, DRAW_DATE, activeStation, ImportBatchImportMode.IN_DAY))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(
                        ImportBatchType.SUPPLEMENTARY, false, List.of("warning")));

        ImportBatchClassificationPreviewResponse response = importBatchService.previewClassification(
                ImportBatchClassificationPreviewRequest.builder()
                        .lotteryStationId(1L)
                        .drawDate(DRAW_DATE)
                        .importMode(ImportBatchImportMode.IN_DAY)
                        .build()
        );

        assertThat(response.resolvedBatchType()).isEqualTo(ImportBatchType.SUPPLEMENTARY);
        assertThat(response.lateImportWarning()).isFalse();
    }

    private void fixedClock(LocalDateTime dateTime) {
        when(clock.instant()).thenReturn(dateTime.atZone(ZONE).toInstant());
        when(clock.getZone()).thenReturn(ZONE);
    }

    private CreateImportBatchRequest buildRequest(String sharedInvoiceUrl) {
        return CreateImportBatchRequest.builder()
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .importMode(ImportBatchImportMode.IN_DAY)
                .sharedInvoiceEvidenceUrl(sharedInvoiceUrl)
                .lines(List.of(buildLine(1L, 10, null)))
                .build();
    }

    private CreateImportBatchLineRequest buildLine(Long stationId, int qty, String invoiceUrl) {
        return CreateImportBatchLineRequest.builder()
                .lotteryStationId(stationId)
                .declareQuantity(qty)
                .importCost(BigDecimal.valueOf(10000))
                .invoiceEvidenceUrl(invoiceUrl)
                .build();
    }
}
