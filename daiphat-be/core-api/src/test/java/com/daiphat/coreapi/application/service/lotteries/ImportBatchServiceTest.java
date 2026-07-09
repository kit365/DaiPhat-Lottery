package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchRequest;
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
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import com.daiphat.coreapi.shared.util.ImportBatchCodeGenerator;
import com.daiphat.coreapi.shared.util.ImportBatchDraftExpiryService;
import com.daiphat.coreapi.shared.util.ImportBatchImportModeResolver;
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
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
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
    private ImportBatchDraftExpiryService importBatchDraftExpiryService;
    @Mock
    private com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock
    private com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort lotteryTicketServicePort;
    @Mock
    private ImportBatchImportModeResolver importBatchImportModeResolver;
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
        when(importBatchCodeGenerator.generateHeaderCode(any())).thenReturn("PN-20260706-0001");
        when(importBatchCodeGenerator.generateLineCode(any(), any(), any())).thenReturn("LO-20260706-CAMAU-NEW-0001");
        when(lotteryStationServicePort.getScheduleModelsByDrawDate(DRAW_DATE)).thenReturn(List.of(activeStation));
        when(stationEligibilityResolver.isEligibleForSelection(
                any(), eq(DRAW_DATE), any(), eq(ImportBatchImportMode.IN_DAY)
        )).thenReturn(true);
        when(importBatchRepositoryPort.findEditableBatchByImportedByAndDrawDateAndSupplierAndImportMode(
                any(), any(), any(), any()
        )).thenReturn(Optional.empty());
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
                        buildLine(1L, 10),
                        buildLine(1L, 5)
                ))
                .build();

        assertThatThrownBy(() -> importBatchService.create(request, OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_DUPLICATE_STATION);
    }

    @Test
    @DisplayName("create is soft-blocked when matching unfinished batch exists")
    void create_matchingUnfinishedBatch_throwsWithExistingBatch() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));
        ImportBatchModel existing = ImportBatchModel.builder()
                .id(99L)
                .batchCode("PN-20260706-0099")
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .importMode(ImportBatchImportMode.IN_DAY)
                .status(ImportBatchStatus.DRAFT)
                .build();
        ImportBatchResponse existingResponse = ImportBatchResponse.builder()
                .id(99L)
                .batchCode("PN-20260706-0099")
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .importMode(ImportBatchImportMode.IN_DAY)
                .status(ImportBatchStatus.DRAFT)
                .build();

        when(importBatchRepositoryPort.findEditableBatchByImportedByAndDrawDateAndSupplierAndImportMode(
                eq(OPERATOR_ID), eq(DRAW_DATE), eq(SUPPLIER_ID), eq(ImportBatchImportMode.IN_DAY)
        )).thenReturn(Optional.of(existing));
        when(importBatchApplicationMapper.toResponse(existing)).thenReturn(existingResponse);

        assertThatThrownBy(() -> importBatchService.create(buildRequest("https://cdn.example/invoice.jpg"), OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException domainException = (DomainException) ex;
                    assertThat(domainException.getErrorCode())
                            .isEqualTo(ErrorCode.IMPORT_BATCH_DRAFT_ALREADY_EXISTS);
                    assertThat(domainException.getData()).isEqualTo(existingResponse);
                });
    }

    @Test
    @DisplayName("create with forceCreate bypasses unfinished duplicate soft-block")
    void create_forceCreate_bypassesMatchingUnfinishedBatch() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));
        ImportBatchModel existing = ImportBatchModel.builder()
                .id(99L)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .importMode(ImportBatchImportMode.IN_DAY)
                .status(ImportBatchStatus.DRAFT)
                .build();
        when(importBatchRepositoryPort.findEditableBatchByImportedByAndDrawDateAndSupplierAndImportMode(
                eq(OPERATOR_ID), eq(DRAW_DATE), eq(SUPPLIER_ID), eq(ImportBatchImportMode.IN_DAY)
        )).thenReturn(Optional.of(existing));

        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);
        when(importBatchTypeResolver.resolve(1L, DRAW_DATE, activeStation, ImportBatchImportMode.IN_DAY))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(ImportBatchType.NEW, false, List.of()));

        ImportBatchLineModel lineModel = ImportBatchLineModel.builder()
                .lotteryStationId(1L)
                .declareQuantity(10)
                .importCost(BigDecimal.valueOf(10000))
                .build();
        when(importBatchApplicationMapper.toLineModel(any())).thenReturn(lineModel);

        ImportBatchModel saved = ImportBatchModel.builder()
                .id(10L)
                .drawDate(DRAW_DATE)
                .status(ImportBatchStatus.DRAFT)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(new ArrayList<>(List.of(lineModel)))
                .build();
        lineModel.setBatchType(ImportBatchType.NEW);

        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenReturn(saved);
        when(importBatchApplicationMapper.toResponse(eq(saved), eq(false), any()))
                .thenReturn(ImportBatchResponse.builder().id(10L).build());

        CreateImportBatchRequest request = CreateImportBatchRequest.builder()
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .importMode(ImportBatchImportMode.IN_DAY)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .forceCreate(true)
                .lines(List.of(buildLine(1L, 10)))
                .build();

        ImportBatchResponse response = importBatchService.create(request, OPERATOR_ID);

        assertThat(response.id()).isEqualTo(10L);
        verify(importBatchRepositoryPort).save(any(ImportBatchModel.class));
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
                .build();

        when(importBatchApplicationMapper.toLineModel(any())).thenReturn(lineModel);

        ImportBatchModel saved = ImportBatchModel.builder()
                .id(10L)
                .drawDate(DRAW_DATE)
                .status(ImportBatchStatus.DRAFT)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
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
        assertThat(captor.getValue().getInvoiceEvidenceUrl()).isEqualTo("https://cdn.example/invoice.jpg");
        assertThat(captor.getValue().getLineCount()).isEqualTo(1);
        assertThat(captor.getValue().getSubmittedAt()).isNotNull();
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
                .lines(List.of(buildLine(1L, 10)))
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

    @Test
    @DisplayName("create is rejected when all today's stations already have draft batches")
    void create_allStationsDraft_throws() {
        fixedClock(LocalDateTime.of(2026, 7, 6, 10, 0));
        when(lotteryStationServicePort.getScheduleModelsByDrawDate(DRAW_DATE)).thenReturn(List.of(activeStation));
        when(stationEligibilityResolver.isEligibleForSelection(
                any(), eq(DRAW_DATE), any(), eq(ImportBatchImportMode.IN_DAY)
        )).thenReturn(false);

        assertThatThrownBy(() -> importBatchService.create(buildRequest("https://cdn.example/invoice.jpg"), OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_ALL_STATIONS_DRAFT);
    }

    @Test
    @DisplayName("deleteLine is rejected when only one active line remains")
    void deleteLine_lastActiveLine_throws() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));
        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.RECEIVING)
                .build();
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(importBatchLineRepositoryPort.countActiveByImportBatchId(10L)).thenReturn(1L);

        assertThatThrownBy(() -> importBatchService.deleteLine(10L, 100L))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_LAST_LINE_CANNOT_DELETE);
    }

    @Test
    @DisplayName("deleteLine is rejected when batch is not editable")
    void deleteLine_importedBatch_throws() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));
        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.IMPORTED)
                .build();
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(importBatchLineRepositoryPort.countActiveByImportBatchId(10L)).thenReturn(2L);

        assertThatThrownBy(() -> importBatchService.deleteLine(10L, 100L))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
    }

    @Test
    @DisplayName("deleteLine purges tickets, soft-deletes line, and recalculates batch")
    void deleteLine_success_purgesAndRecalculates() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));

        ImportBatchLineModel remainingLine = ImportBatchLineModel.builder()
                .id(201L)
                .importBatchId(10L)
                .declareQuantity(10)
                .totalQuantity(10)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.IMPORTED)
                .build();
        remainingLine.recalculateDeclaredCostValue();
        remainingLine.recalculateTotalCostValue();

        ImportBatchLineModel deletingLine = ImportBatchLineModel.builder()
                .id(200L)
                .importBatchId(10L)
                .declareQuantity(5)
                .totalQuantity(2)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.IMPORTING)
                .build();

        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.RECEIVING)
                .lines(new ArrayList<>(List.of(remainingLine, deletingLine)))
                .build();
        batch.recalculateAggregates();

        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(importBatchLineRepositoryPort.countActiveByImportBatchId(10L)).thenReturn(2L);
        when(importBatchLineRepositoryPort.findById(200L)).thenReturn(Optional.of(deletingLine));
        when(importBatchLineRepositoryPort.findByImportBatchId(10L)).thenReturn(List.of(remainingLine));
        doNothing().when(lotteryTicketServicePort).purgeImportBatchLineTickets(200L);
        when(importBatchLineRepositoryPort.save(any(ImportBatchLineModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ImportBatchModel savedBatch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.IMPORTED)
                .lines(new ArrayList<>(List.of(remainingLine)))
                .build();
        savedBatch.recalculateAggregates();
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenReturn(savedBatch);
        when(importBatchApplicationMapper.toResponse(savedBatch))
                .thenReturn(ImportBatchResponse.builder().id(10L).status(ImportBatchStatus.IMPORTED).build());

        ImportBatchResponse response = importBatchService.deleteLine(10L, 200L);

        verify(lotteryTicketServicePort).purgeImportBatchLineTickets(200L);
        verify(lotteryTicketServicePort).activateTicketsForImportBatchLine(201L);
        assertThat(response.status()).isEqualTo(ImportBatchStatus.IMPORTED);
        assertThat(deletingLine.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("update allows adding a new line on RECEIVING batch")
    void update_receivingBatch_addNewLine_succeeds() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));

        ImportBatchLineModel existingLine = ImportBatchLineModel.builder()
                .id(100L)
                .importBatchId(10L)
                .lotteryStationId(1L)
                .declareQuantity(10)
                .totalQuantity(0)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.OPEN)
                .batchType(ImportBatchType.NEW)
                .build();
        existingLine.recalculateDeclaredCostValue();
        existingLine.recalculateTotalCostValue();

        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.RECEIVING)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(new ArrayList<>(List.of(existingLine)))
                .build();
        batch.recalculateAggregates();

        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);
        when(importBatchLineRepositoryPort.findByImportBatchId(10L)).thenReturn(List.of(existingLine));
        when(importBatchLineRepositoryPort.findDeletedByImportBatchIdAndStationId(10L, 2L))
                .thenReturn(Optional.empty());
        when(importBatchLineRepositoryPort.save(any(ImportBatchLineModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        doNothing().when(stationEligibilityResolver).validateStationEligibleOrThrow(
                any(), any(), any(), any(), any());
        when(importBatchTypeResolver.resolve(anyLong(), any(LocalDate.class), any(LotteryStationModel.class), any(ImportBatchImportMode.class)))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(
                        ImportBatchType.SUPPLEMENTARY, false, List.of()));
        LotteryStationModel station2 = LotteryStationModel.builder().id(2L).name("An Giang").isActive(true).build();
        when(lotteryStationServicePort.getModelById(2L)).thenReturn(station2);
        when(importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDateExcludingBatch(2L, DRAW_DATE, 10L))
                .thenReturn(false);
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchApplicationMapper.toResponse(any(ImportBatchModel.class)))
                .thenReturn(ImportBatchResponse.builder().id(10L).status(ImportBatchStatus.RECEIVING).build());

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(List.of(
                        UpdateImportBatchLineRequest.builder()
                                .id(100L)
                                .lotteryStationId(1L)
                                .declareQuantity(10)
                                .importCost(BigDecimal.valueOf(10000))
                                .build(),
                        UpdateImportBatchLineRequest.builder()
                                .lotteryStationId(2L)
                                .declareQuantity(5)
                                .importCost(BigDecimal.valueOf(10000))
                                .build()
                ))
                .build();

        ImportBatchResponse response = importBatchService.update(10L, request);

        assertThat(response.status()).isEqualTo(ImportBatchStatus.RECEIVING);
        verify(importBatchLineRepositoryPort, org.mockito.Mockito.atLeastOnce()).save(any(ImportBatchLineModel.class));
    }

    @Test
    @DisplayName("update allows increasing declare quantity on IMPORTING line")
    void update_importingLine_increaseDeclareQuantity_succeeds() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));

        ImportBatchLineModel importingLine = ImportBatchLineModel.builder()
                .id(100L)
                .importBatchId(10L)
                .lotteryStationId(1L)
                .declareQuantity(5000)
                .totalQuantity(2000)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.IMPORTING)
                .batchType(ImportBatchType.NEW)
                .build();
        importingLine.recalculateDeclaredCostValue();
        importingLine.recalculateTotalCostValue();

        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.RECEIVING)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(new ArrayList<>(List.of(importingLine)))
                .build();
        batch.recalculateAggregates();

        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(10L)).thenReturn(List.of(importingLine));
        when(importBatchLineRepositoryPort.save(any(ImportBatchLineModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchApplicationMapper.toResponse(any(ImportBatchModel.class)))
                .thenReturn(ImportBatchResponse.builder().id(10L).status(ImportBatchStatus.RECEIVING).build());

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(List.of(UpdateImportBatchLineRequest.builder()
                        .id(100L)
                        .lotteryStationId(1L)
                        .declareQuantity(6000)
                        .importCost(BigDecimal.valueOf(10000))
                        .build()))
                .build();

        importBatchService.update(10L, request);

        assertThat(importingLine.getDeclareQuantity()).isEqualTo(6000);
        assertThat(importingLine.getStatus()).isEqualTo(ImportBatchLineStatus.IMPORTING);
        assertThat(importingLine.getTotalQuantity()).isEqualTo(2000);
    }

    @Test
    @DisplayName("update allows decreasing declare quantity when still above imported count")
    void update_importingLine_decreaseDeclareQuantityStillAboveImported_succeeds() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));

        ImportBatchLineModel importingLine = ImportBatchLineModel.builder()
                .id(100L)
                .importBatchId(10L)
                .lotteryStationId(1L)
                .declareQuantity(5000)
                .totalQuantity(2000)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.IMPORTING)
                .batchType(ImportBatchType.NEW)
                .build();
        importingLine.recalculateDeclaredCostValue();
        importingLine.recalculateTotalCostValue();

        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.RECEIVING)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(new ArrayList<>(List.of(importingLine)))
                .build();
        batch.recalculateAggregates();

        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(10L)).thenReturn(List.of(importingLine));
        when(importBatchLineRepositoryPort.save(any(ImportBatchLineModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchApplicationMapper.toResponse(any(ImportBatchModel.class)))
                .thenReturn(ImportBatchResponse.builder().id(10L).status(ImportBatchStatus.RECEIVING).build());

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(List.of(UpdateImportBatchLineRequest.builder()
                        .id(100L)
                        .lotteryStationId(1L)
                        .declareQuantity(3000)
                        .importCost(BigDecimal.valueOf(10000))
                        .build()))
                .build();

        importBatchService.update(10L, request);

        assertThat(importingLine.getDeclareQuantity()).isEqualTo(3000);
        assertThat(importingLine.getStatus()).isEqualTo(ImportBatchLineStatus.IMPORTING);
    }

    @Test
    @DisplayName("update rejects decreasing declare quantity below imported count")
    void update_importingLine_decreaseBelowImported_throws() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));

        ImportBatchLineModel importingLine = ImportBatchLineModel.builder()
                .id(100L)
                .importBatchId(10L)
                .lotteryStationId(1L)
                .declareQuantity(5000)
                .totalQuantity(2000)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.IMPORTING)
                .build();

        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.RECEIVING)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(new ArrayList<>(List.of(importingLine)))
                .build();

        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(List.of(UpdateImportBatchLineRequest.builder()
                        .id(100L)
                        .lotteryStationId(1L)
                        .declareQuantity(1500)
                        .importCost(BigDecimal.valueOf(10000))
                        .build()))
                .build();

        assertThatThrownBy(() -> importBatchService.update(10L, request))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_DECLARE_QUANTITY_BELOW_IMPORTED);
    }

    @Test
    @DisplayName("update allows removing IMPORTING line via removed flag")
    void update_removeImportingLine_succeeds() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));

        ImportBatchLineModel importingLine = ImportBatchLineModel.builder()
                .id(100L)
                .importBatchId(10L)
                .lotteryStationId(1L)
                .declareQuantity(10)
                .totalQuantity(2)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.IMPORTING)
                .build();
        ImportBatchLineModel remainingLine = ImportBatchLineModel.builder()
                .id(101L)
                .importBatchId(10L)
                .lotteryStationId(2L)
                .declareQuantity(5)
                .totalQuantity(0)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.OPEN)
                .build();

        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.RECEIVING)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(new ArrayList<>(List.of(importingLine, remainingLine)))
                .build();
        batch.recalculateAggregates();

        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(importBatchLineRepositoryPort.countActiveByImportBatchId(10L)).thenReturn(2L);
        when(importBatchLineRepositoryPort.findByImportBatchId(10L)).thenReturn(List.of(remainingLine));
        when(importBatchLineRepositoryPort.save(any(ImportBatchLineModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        doNothing().when(lotteryTicketServicePort).purgeImportBatchLineTickets(100L);
        LotteryStationModel station2 = LotteryStationModel.builder().id(2L).name("An Giang").isActive(true).build();
        when(lotteryStationServicePort.getModelById(2L)).thenReturn(station2);
        when(importBatchTypeResolver.resolve(eq(2L), eq(DRAW_DATE), any(LotteryStationModel.class), eq(ImportBatchImportMode.IN_DAY)))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(
                        ImportBatchType.NEW, false, List.of()));
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchApplicationMapper.toResponse(any(ImportBatchModel.class)))
                .thenReturn(ImportBatchResponse.builder().id(10L).status(ImportBatchStatus.RECEIVING).build());

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(List.of(
                        UpdateImportBatchLineRequest.builder()
                                .id(100L)
                                .lotteryStationId(1L)
                                .declareQuantity(10)
                                .importCost(BigDecimal.valueOf(10000))
                                .removed(true)
                                .build(),
                        UpdateImportBatchLineRequest.builder()
                                .id(101L)
                                .lotteryStationId(2L)
                                .declareQuantity(5)
                                .importCost(BigDecimal.valueOf(10000))
                                .build()
                ))
                .build();

        importBatchService.update(10L, request);

        verify(lotteryTicketServicePort).purgeImportBatchLineTickets(100L);
        assertThat(importingLine.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("update allows removing CANCELLED line via removed flag")
    void update_removeCancelledLine_succeeds() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));

        ImportBatchLineModel cancelledLine = ImportBatchLineModel.builder()
                .id(100L)
                .importBatchId(10L)
                .lotteryStationId(1L)
                .declareQuantity(10)
                .totalQuantity(0)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.CANCELLED)
                .build();
        ImportBatchLineModel remainingLine = ImportBatchLineModel.builder()
                .id(101L)
                .importBatchId(10L)
                .lotteryStationId(2L)
                .declareQuantity(5)
                .totalQuantity(0)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.OPEN)
                .build();

        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.RECEIVING)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(new ArrayList<>(List.of(cancelledLine, remainingLine)))
                .build();
        batch.recalculateAggregates();

        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(importBatchLineRepositoryPort.countActiveByImportBatchId(10L)).thenReturn(2L);
        when(importBatchLineRepositoryPort.findByImportBatchId(10L)).thenReturn(List.of(remainingLine));
        when(importBatchLineRepositoryPort.save(any(ImportBatchLineModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        LotteryStationModel station2 = LotteryStationModel.builder().id(2L).name("An Giang").isActive(true).build();
        when(lotteryStationServicePort.getModelById(2L)).thenReturn(station2);
        when(importBatchTypeResolver.resolve(eq(2L), eq(DRAW_DATE), any(LotteryStationModel.class), eq(ImportBatchImportMode.IN_DAY)))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(
                        ImportBatchType.NEW, false, List.of()));
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchApplicationMapper.toResponse(any(ImportBatchModel.class)))
                .thenReturn(ImportBatchResponse.builder().id(10L).status(ImportBatchStatus.RECEIVING).build());

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(List.of(
                        UpdateImportBatchLineRequest.builder()
                                .id(100L)
                                .lotteryStationId(1L)
                                .declareQuantity(10)
                                .importCost(BigDecimal.valueOf(10000))
                                .removed(true)
                                .build(),
                        UpdateImportBatchLineRequest.builder()
                                .id(101L)
                                .lotteryStationId(2L)
                                .declareQuantity(5)
                                .importCost(BigDecimal.valueOf(10000))
                                .build()
                ))
                .build();

        importBatchService.update(10L, request);

        assertThat(cancelledLine.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("update rejects removing IMPORTED line via removed flag")
    void update_removeImportedLine_throws() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));

        ImportBatchLineModel importedLine = ImportBatchLineModel.builder()
                .id(100L)
                .importBatchId(10L)
                .lotteryStationId(1L)
                .declareQuantity(10)
                .totalQuantity(10)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.IMPORTED)
                .build();
        ImportBatchLineModel openLine = ImportBatchLineModel.builder()
                .id(101L)
                .importBatchId(10L)
                .lotteryStationId(2L)
                .declareQuantity(5)
                .totalQuantity(0)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.OPEN)
                .build();

        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.PARTIALLY_IMPORTED)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(new ArrayList<>(List.of(importedLine, openLine)))
                .build();

        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(List.of(
                        UpdateImportBatchLineRequest.builder()
                                .id(100L)
                                .lotteryStationId(1L)
                                .declareQuantity(10)
                                .importCost(BigDecimal.valueOf(10000))
                                .removed(true)
                                .build(),
                        UpdateImportBatchLineRequest.builder()
                                .id(101L)
                                .lotteryStationId(2L)
                                .declareQuantity(5)
                                .importCost(BigDecimal.valueOf(10000))
                                .build()
                ))
                .build();

        assertThatThrownBy(() -> importBatchService.update(10L, request))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_LINE_NOT_DELETABLE);
    }

    @Test
    @DisplayName("update rejects line edits when batch is not editable")
    void update_nonEditableBatchLineEdits_throws() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));
        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.IMPORTED)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .build();
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .lines(List.of(UpdateImportBatchLineRequest.builder()
                        .id(100L)
                        .lotteryStationId(1L)
                        .declareQuantity(10)
                        .importCost(BigDecimal.valueOf(10000))
                        .build()))
                .build();

        assertThatThrownBy(() -> importBatchService.update(10L, request))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
    }

    @Test
    @DisplayName("update allows supplier-only change for RECEIVING batch")
    void update_receivingBatchSupplierOnly_succeeds() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));
        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.RECEIVING)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .supplierName("Old Supplier")
                .lines(new ArrayList<>())
                .build();
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchApplicationMapper.toResponse(any(ImportBatchModel.class)))
                .thenReturn(ImportBatchResponse.builder().id(10L).status(ImportBatchStatus.RECEIVING).build());

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .build();

        ImportBatchResponse response = importBatchService.update(10L, request);

        assertThat(response.status()).isEqualTo(ImportBatchStatus.RECEIVING);
        assertThat(batch.getSupplierName()).isEqualTo("Tổng đại lý Minh Chính");
    }

    @Test
    @DisplayName("update rejects supplier change when imported lines exist")
    void update_supplierChangeWithImportedLine_throws() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));
        ImportBatchLineModel importedLine = ImportBatchLineModel.builder()
                .id(100L)
                .importBatchId(10L)
                .status(ImportBatchLineStatus.IMPORTED)
                .build();
        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.PARTIALLY_IMPORTED)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .lines(new ArrayList<>(List.of(importedLine)))
                .build();
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(99L)
                .build();

        assertThatThrownBy(() -> importBatchService.update(10L, request))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_SUPPLIER_LOCKED_IMPORTED_LINES);
    }

    @Test
    @DisplayName("update allows invoice evidence replacement for RECEIVING IN_DAY batch")
    void update_receivingBatchInvoiceEvidence_succeeds() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));
        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.RECEIVING)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .supplierName("Old Supplier")
                .invoiceEvidenceUrl("https://cdn.example/old-invoice.jpg")
                .lines(new ArrayList<>())
                .build();
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchApplicationMapper.toResponse(any(ImportBatchModel.class)))
                .thenReturn(ImportBatchResponse.builder().id(10L).status(ImportBatchStatus.RECEIVING).build());

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/new-invoice.jpg")
                .build();

        importBatchService.update(10L, request);

        assertThat(batch.getInvoiceEvidenceUrl()).isEqualTo("https://cdn.example/new-invoice.jpg");
    }

    @Test
    @DisplayName("update recalculates OPEN line batch type and updates supplier")
    void update_openLine_recalculatesBatchType() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));

        ImportBatchLineModel openLine = ImportBatchLineModel.builder()
                .id(200L)
                .importBatchId(10L)
                .lotteryStationId(1L)
                .declareQuantity(10)
                .totalQuantity(0)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.OPEN)
                .batchType(ImportBatchType.NEW)
                .build();
        openLine.recalculateDeclaredCostValue();
        openLine.recalculateTotalCostValue();

        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.DRAFT)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(new ArrayList<>(List.of(openLine)))
                .build();
        batch.recalculateAggregates();

        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);
        when(importBatchLineRepositoryPort.findByImportBatchId(10L)).thenReturn(List.of(openLine));
        when(importBatchLineRepositoryPort.save(any(ImportBatchLineModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchTypeResolver.resolve(1L, DRAW_DATE, activeStation, ImportBatchImportMode.IN_DAY))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(
                        ImportBatchType.SUPPLEMENTARY, false, List.of()));
        when(importBatchCodeGenerator.generateLineCode(any(), eq(ImportBatchType.SUPPLEMENTARY), eq(DRAW_DATE)))
                .thenReturn("LO-20260706-CAMAU-SUPPLEMENTARY-0001");

        ImportBatchModel saved = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.DRAFT)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .supplierName("Tổng đại lý Minh Chính")
                .lines(new ArrayList<>(List.of(openLine)))
                .build();
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenReturn(saved);
        when(importBatchApplicationMapper.toResponse(saved))
                .thenReturn(ImportBatchResponse.builder().id(10L).status(ImportBatchStatus.DRAFT).build());

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(List.of(UpdateImportBatchLineRequest.builder()
                        .id(200L)
                        .lotteryStationId(1L)
                        .declareQuantity(12)
                        .importCost(BigDecimal.valueOf(11000))
                        .build()))
                .build();

        ImportBatchResponse response = importBatchService.update(10L, request);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(openLine.getBatchType()).isEqualTo(ImportBatchType.SUPPLEMENTARY);
        assertThat(openLine.getDeclareQuantity()).isEqualTo(12);
    }

    @Test
    @DisplayName("update revives a soft-deleted line when the same station is re-added")
    void update_removeAndReaddSameStation_revivesLine() {
        fixedClock(LocalDateTime.of(2026, 7, 7, 10, 0));

        ImportBatchLineModel removedLine = ImportBatchLineModel.builder()
                .id(200L)
                .importBatchId(10L)
                .lotteryStationId(1L)
                .declareQuantity(10)
                .totalQuantity(0)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.OPEN)
                .batchType(ImportBatchType.NEW)
                .build();
        removedLine.recalculateDeclaredCostValue();
        removedLine.recalculateTotalCostValue();

        ImportBatchLineModel remainingLine = ImportBatchLineModel.builder()
                .id(201L)
                .importBatchId(10L)
                .lotteryStationId(2L)
                .declareQuantity(5)
                .totalQuantity(0)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.OPEN)
                .batchType(ImportBatchType.NEW)
                .build();
        remainingLine.recalculateDeclaredCostValue();
        remainingLine.recalculateTotalCostValue();

        ImportBatchModel batch = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.DRAFT)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(new ArrayList<>(List.of(removedLine, remainingLine)))
                .build();
        batch.recalculateAggregates();

        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(importBatchLineRepositoryPort.countActiveByImportBatchId(10L)).thenReturn(2L);
        when(lotteryStationServicePort.getModelById(1L)).thenReturn(activeStation);
        when(lotteryStationServicePort.getModelById(2L)).thenReturn(
                LotteryStationModel.builder()
                        .id(2L)
                        .name("Sóc Trăng")
                        .isActive(true)
                        .drawDays(List.of(DayOfWeek.MONDAY))
                        .drawTime(LocalTime.of(16, 15))
                        .build()
        );
        when(importBatchLineRepositoryPort.findByImportBatchId(10L))
                .thenReturn(List.of(remainingLine), List.of(remainingLine, removedLine));
        when(importBatchLineRepositoryPort.findDeletedByImportBatchIdAndStationId(10L, 1L))
                .thenAnswer(invocation -> removedLine.getDeletedAt() != null
                        ? Optional.of(removedLine)
                        : Optional.empty());
        when(importBatchLineRepositoryPort.save(any(ImportBatchLineModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        doNothing().when(lotteryTicketServicePort).purgeImportBatchLineTickets(200L);
        when(importBatchTypeResolver.resolve(1L, DRAW_DATE, activeStation, ImportBatchImportMode.IN_DAY))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(
                        ImportBatchType.NEW, false, List.of()));
        when(importBatchTypeResolver.resolve(eq(2L), eq(DRAW_DATE), any(), eq(ImportBatchImportMode.IN_DAY)))
                .thenReturn(new ImportBatchTypeResolver.ClassificationResult(
                        ImportBatchType.NEW, false, List.of()));
        when(importBatchCodeGenerator.generateLineCode(any(), eq(ImportBatchType.NEW), eq(DRAW_DATE)))
                .thenReturn("LO-20260706-CAMAU-NEW-0001");

        ImportBatchModel saved = ImportBatchModel.builder()
                .id(10L)
                .status(ImportBatchStatus.DRAFT)
                .importMode(ImportBatchImportMode.IN_DAY)
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .lines(new ArrayList<>(List.of(remainingLine, removedLine)))
                .build();
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class))).thenReturn(saved);
        when(importBatchApplicationMapper.toResponse(saved))
                .thenReturn(ImportBatchResponse.builder().id(10L).status(ImportBatchStatus.DRAFT).build());

        UpdateImportBatchRequest request = UpdateImportBatchRequest.builder()
                .supplierId(SUPPLIER_ID)
                .invoiceEvidenceUrl("https://cdn.example/invoice.jpg")
                .lines(List.of(
                        UpdateImportBatchLineRequest.builder()
                                .id(200L)
                                .lotteryStationId(1L)
                                .declareQuantity(10)
                                .importCost(BigDecimal.valueOf(10000))
                                .removed(true)
                                .build(),
                        UpdateImportBatchLineRequest.builder()
                                .id(201L)
                                .lotteryStationId(2L)
                                .declareQuantity(5)
                                .importCost(BigDecimal.valueOf(10000))
                                .build(),
                        UpdateImportBatchLineRequest.builder()
                                .lotteryStationId(1L)
                                .declareQuantity(15)
                                .importCost(BigDecimal.valueOf(12000))
                                .build()
                ))
                .build();

        ImportBatchResponse response = importBatchService.update(10L, request);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(removedLine.getDeletedAt()).isNull();
        assertThat(removedLine.getDeclareQuantity()).isEqualTo(15);
        assertThat(removedLine.getImportCost()).isEqualByComparingTo(BigDecimal.valueOf(12000));
        assertThat(removedLine.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
    }

    private void fixedClock(LocalDateTime dateTime) {
        when(clock.instant()).thenReturn(dateTime.atZone(ZONE).toInstant());
        when(clock.getZone()).thenReturn(ZONE);
    }

    private CreateImportBatchRequest buildRequest(String invoiceUrl) {
        return CreateImportBatchRequest.builder()
                .drawDate(DRAW_DATE)
                .supplierId(SUPPLIER_ID)
                .importMode(ImportBatchImportMode.IN_DAY)
                .invoiceEvidenceUrl(invoiceUrl)
                .lines(List.of(buildLine(1L, 10)))
                .build();
    }

    private CreateImportBatchLineRequest buildLine(Long stationId, int qty) {
        return CreateImportBatchLineRequest.builder()
                .lotteryStationId(stationId)
                .declareQuantity(qty)
                .importCost(BigDecimal.valueOf(10000))
                .build();
    }
}
