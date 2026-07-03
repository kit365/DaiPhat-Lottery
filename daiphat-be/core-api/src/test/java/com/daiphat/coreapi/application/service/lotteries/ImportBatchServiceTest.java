package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchClassificationPreviewRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchClassificationPreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ImportBatchApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import com.daiphat.coreapi.shared.util.ImportBatchTimePolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ImportBatchService Unit Tests")
class ImportBatchServiceTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate DRAW_DATE = LocalDate.of(2026, 7, 6);
    private static final UUID OPERATOR_ID = UUID.randomUUID();

    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock
    private LotteryStationServicePort lotteryStationServicePort;
    @Mock
    private ImportBatchApplicationMapper importBatchApplicationMapper;
    @Mock
    private ImportBatchConfigResolver importBatchConfigResolver;
    @Mock
    private Clock clock;

    @InjectMocks
    private ImportBatchService importBatchService;

    private LotteryStationModel activeStation;

    @BeforeEach
    void setUp() {
        activeStation = LotteryStationModel.builder()
                .id(1L)
                .name("Cà Mau")
                .isActive(true)
                .drawDays(List.of(DayOfWeek.MONDAY))
                .drawTime(LocalTime.of(16, 15))
                .build();
    }

    @Test
    @DisplayName("create NEW batch before late window succeeds with invoice")
    void create_newBatchBeforeLateWindow_success() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));
        stubConfigTimes();
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);

        CreateImportBatchRequest request = buildRequest(ImportBatchType.NEW, "https://cdn.example/invoice.jpg");
        ImportBatchModel mapped = mappedModel(request);
        ImportBatchModel saved = mappedModel(request);
        saved.setId(10L);
        saved.setBatchType(ImportBatchType.NEW);
        saved.setStatus(ImportBatchStatus.DRAFT);

        when(importBatchApplicationMapper.toModel(request)).thenReturn(mapped);
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenReturn(saved);
        when(importBatchApplicationMapper.toResponse(eq(saved), any(ImportBatchTimePolicy.ClassificationResult.class)))
                .thenReturn(ImportBatchResponse.builder().id(10L).batchType(ImportBatchType.NEW).build());

        ImportBatchResponse response = importBatchService.create(request, OPERATOR_ID);

        assertThat(response.batchType()).isEqualTo(ImportBatchType.NEW);

        ArgumentCaptor<ImportBatchModel> captor = ArgumentCaptor.forClass(ImportBatchModel.class);
        verify(importBatchRepositoryPort).save(captor.capture());
        ImportBatchModel persisted = captor.getValue();
        assertThat(persisted.getBatchType()).isEqualTo(ImportBatchType.NEW);
        assertThat(persisted.getRequestedBatchType()).isEqualTo(ImportBatchType.NEW);
        assertThat(persisted.getStatus()).isEqualTo(ImportBatchStatus.DRAFT);
        assertThat(persisted.getTotalQuantity()).isZero();
    }

    @Test
    @DisplayName("create SUPPLEMENTARY batch does not require invoice")
    void create_supplementaryWithoutInvoice_success() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));
        stubConfigTimes();
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);

        CreateImportBatchRequest request = buildRequest(ImportBatchType.SUPPLEMENTARY, null);
        ImportBatchModel mapped = mappedModel(request);
        ImportBatchModel saved = mappedModel(request);
        saved.setId(11L);
        saved.setBatchType(ImportBatchType.SUPPLEMENTARY);

        when(importBatchApplicationMapper.toModel(request)).thenReturn(mapped);
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenReturn(saved);
        when(importBatchApplicationMapper.toResponse(eq(saved), any(ImportBatchTimePolicy.ClassificationResult.class)))
                .thenReturn(ImportBatchResponse.builder().id(11L).batchType(ImportBatchType.SUPPLEMENTARY).build());

        ImportBatchResponse response = importBatchService.create(request, OPERATOR_ID);

        assertThat(response.batchType()).isEqualTo(ImportBatchType.SUPPLEMENTARY);
    }

    @Test
    @DisplayName("create during late window forces LATE_IMPORT")
    void create_lateWindow_forcesLateImport() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 14, 45));
        stubConfigTimes();
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);

        CreateImportBatchRequest request = buildRequest(ImportBatchType.NEW, "https://cdn.example/invoice.jpg");
        ImportBatchModel mapped = mappedModel(request);
        ImportBatchModel saved = mappedModel(request);
        saved.setId(12L);
        saved.setBatchType(ImportBatchType.LATE_IMPORT);

        when(importBatchApplicationMapper.toModel(request)).thenReturn(mapped);
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenReturn(saved);
        when(importBatchApplicationMapper.toResponse(eq(saved), any(ImportBatchTimePolicy.ClassificationResult.class)))
                .thenReturn(ImportBatchResponse.builder()
                        .id(12L)
                        .batchType(ImportBatchType.LATE_IMPORT)
                        .lateImportWarning(true)
                        .build());

        ImportBatchResponse response = importBatchService.create(request, OPERATOR_ID);

        assertThat(response.batchType()).isEqualTo(ImportBatchType.LATE_IMPORT);
        assertThat(response.lateImportWarning()).isTrue();
    }

    @Test
    @DisplayName("create after cutoff on draw day is rejected")
    void create_afterCutoff_throws() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 15, 1));
        stubConfigTimes();
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);

        CreateImportBatchRequest request = buildRequest(ImportBatchType.NEW, "https://cdn.example/invoice.jpg");

        assertThatThrownBy(() -> importBatchService.create(request, OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_CUTOFF_PASSED);
    }

    @Test
    @DisplayName("create NEW without invoice is rejected")
    void create_newWithoutInvoice_throws() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));
        stubConfigTimes();
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);

        CreateImportBatchRequest request = buildRequest(ImportBatchType.NEW, null);
        ImportBatchModel mapped = mappedModel(request);
        when(importBatchApplicationMapper.toModel(request)).thenReturn(mapped);

        assertThatThrownBy(() -> importBatchService.create(request, OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_INVOICE_REQUIRED);
    }

    @Test
    @DisplayName("create for inactive station is rejected")
    void create_inactiveStation_throws() {
        activeStation.setActive(false);
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);

        CreateImportBatchRequest request = buildRequest(ImportBatchType.NEW, "https://cdn.example/invoice.jpg");

        assertThatThrownBy(() -> importBatchService.create(request, OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_STATION_INACTIVE);
    }

    @Test
    @DisplayName("create with draw date not on station schedule is rejected")
    void create_invalidDrawDate_throws() {
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);

        CreateImportBatchRequest request = CreateImportBatchRequest.builder()
                .lotteryStationId(1L)
                .drawDate(LocalDate.of(2026, 7, 7))
                .declareQuantity(10)
                .importCost(BigDecimal.valueOf(10000))
                .requestedBatchType(ImportBatchType.NEW)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .build();

        assertThatThrownBy(() -> importBatchService.create(request, OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_DRAW_DATE_INVALID);
    }

    @Test
    @DisplayName("previewClassification returns late import warning in window")
    void previewClassification_lateWindow_returnsWarning() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 14, 45));
        stubConfigTimes();

        ImportBatchClassificationPreviewResponse response = importBatchService.previewClassification(
                ImportBatchClassificationPreviewRequest.builder()
                        .drawDate(DRAW_DATE)
                        .requestedBatchType(ImportBatchType.NEW)
                        .build()
        );

        assertThat(response.resolvedBatchType()).isEqualTo(ImportBatchType.LATE_IMPORT);
        assertThat(response.lateImportWarning()).isTrue();
        assertThat(response.warnings()).isNotEmpty();
    }

    private void fixedClock(LocalDateTime dateTime) {
        when(clock.instant()).thenReturn(dateTime.atZone(ZONE).toInstant());
        when(clock.getZone()).thenReturn(ZONE);
    }

    private void stubConfigTimes() {
        when(importBatchConfigResolver.resolveLateWindowStart()).thenReturn(LocalTime.of(14, 30));
        when(importBatchConfigResolver.resolveImportCutoff()).thenReturn(LocalTime.of(15, 0));
    }

    private CreateImportBatchRequest buildRequest(ImportBatchType batchType, String invoiceUrl) {
        return CreateImportBatchRequest.builder()
                .lotteryStationId(1L)
                .drawDate(DRAW_DATE)
                .declareQuantity(10)
                .importCost(BigDecimal.valueOf(10000))
                .requestedBatchType(batchType)
                .invoiceEvidenceUrl(invoiceUrl)
                .build();
    }

    private ImportBatchModel mappedModel(CreateImportBatchRequest request) {
        return ImportBatchModel.builder()
                .lotteryStationId(request.lotteryStationId())
                .drawDate(request.drawDate())
                .declareQuantity(request.declareQuantity())
                .importCost(request.importCost())
                .requestedBatchType(request.requestedBatchType())
                .invoiceEvidenceUrl(request.invoiceEvidenceUrl())
                .build();
    }
}
