package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.OcrConfirmImportRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.OcrConfirmImportTicketRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketSerialResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrConfirmImportResponse;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryScanLogServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrConfirmImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanImportOutcome;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.shared.util.ImportBatchDraftExpiryService;
import com.daiphat.coreapi.shared.util.ImportBatchImportModeResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OcrConfirmImportServiceTest {

    @Mock
    private ImportBatchServicePort importBatchServicePort;
    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock
    private ImportBatchDraftExpiryService importBatchDraftExpiryService;
    @Mock
    private ImportBatchImportModeResolver importBatchImportModeResolver;
    @Mock
    private LotteryTicketServicePort lotteryTicketServicePort;
    @Mock
    private LotteryStationServicePort lotteryStationServicePort;
    @Mock
    private OcrScanResultRepositoryPort ocrScanResultRepositoryPort;
    @Mock
    private OcrScanResultFieldService ocrScanResultFieldService;
    @Mock
    private LotteryScanLogServicePort lotteryScanLogServicePort;
    @Mock
    private PlatformTransactionManager transactionManager;

    private OcrConfirmImportService service;
    private UUID operatorId;
    private LocalDate drawDate;
    private LotteryStationModel station;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-08-24T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        service = new OcrConfirmImportService(
                importBatchServicePort,
                importBatchRepositoryPort,
                importBatchDraftExpiryService,
                importBatchImportModeResolver,
                lotteryTicketServicePort,
                lotteryStationServicePort,
                ocrScanResultRepositoryPort,
                ocrScanResultFieldService,
                lotteryScanLogServicePort,
                clock,
                transactionManager
        );
        operatorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        drawDate = LocalDate.of(2026, 8, 24);

        LotteryRegionModel region = LotteryRegionModel.builder()
                .id(1L)
                .code("NAM")
                .name("Miền Nam")
                .minNumber(100000)
                .maxNumber(999999)
                .build();
        station = LotteryStationModel.builder()
                .id(10L)
                .name("TP. Hồ Chí Minh")
                .code("HCM")
                .isActive(true)
                .drawDays(List.of(
                        java.time.DayOfWeek.MONDAY,
                        java.time.DayOfWeek.TUESDAY,
                        java.time.DayOfWeek.WEDNESDAY,
                        java.time.DayOfWeek.THURSDAY,
                        java.time.DayOfWeek.FRIDAY,
                        java.time.DayOfWeek.SATURDAY,
                        java.time.DayOfWeek.SUNDAY
                ))
                .region(region)
                .build();
        when(lotteryStationServicePort.getModelById(10L)).thenReturn(station);

        when(transactionManager.getTransaction(any(TransactionDefinition.class)))
                .thenReturn(new SimpleTransactionStatus());
    }

    @Test
    void autoCreatesBatchPerDrawDateAndImportsTickets() {
        when(importBatchImportModeResolver.resolve(eq(drawDate), any()))
                .thenReturn(ImportBatchImportMode.IN_DAY);
        when(importBatchServicePort.create(any(CreateImportBatchRequest.class), eq(operatorId)))
                .thenReturn(ImportBatchResponse.builder()
                        .id(50L)
                        .batchCode("IB-50")
                        .drawDate(drawDate)
                        .lines(List.of(ImportBatchLineResponse.builder()
                                .id(501L)
                                .lotteryStationId(10L)
                                .declareQuantity(1)
                                .build()))
                        .build());
        when(lotteryTicketServicePort.create(any(CreateLotteryTicketRequest.class), eq(operatorId)))
                .thenReturn(LotteryTicketResponse.builder()
                        .id(900L)
                        .serials(List.of(LotteryTicketSerialResponse.builder()
                                .id(901L)
                                .serialNumber("A012345")
                                .build()))
                        .build());

        OcrConfirmImportResponse response = service.confirm(
                OcrConfirmImportRequest.builder()
                        .mode(OcrConfirmImportMode.AUTO)
                        .supplierId(7L)
                        .invoiceEvidenceUrl("https://example.com/invoice.jpg")
                        .tickets(List.of(ticket(10L, drawDate, "123456", "A012345")))
                        .build(),
                operatorId
        );

        assertThat(response.mode()).isEqualTo(OcrConfirmImportMode.AUTO);
        assertThat(response.successCount()).isEqualTo(1);
        assertThat(response.batches()).hasSize(1);
        assertThat(response.batches().getFirst().importBatchId()).isEqualTo(50L);
        assertThat(response.batches().getFirst().ticketResults().getFirst().outcome())
                .isEqualTo(ScanImportOutcome.SUCCESS);

        ArgumentCaptor<CreateImportBatchRequest> createCaptor =
                ArgumentCaptor.forClass(CreateImportBatchRequest.class);
        verify(importBatchServicePort).create(createCaptor.capture(), eq(operatorId));
        assertThat(createCaptor.getValue().drawDate()).isEqualTo(drawDate);
        assertThat(createCaptor.getValue().supplierId()).isEqualTo(7L);
        assertThat(createCaptor.getValue().totalDeclareQuantity()).isEqualTo(1);
    }

    @Test
    void autoRollsBackDrawDateGroupWhenTicketCreateFails() {
        when(importBatchImportModeResolver.resolve(eq(drawDate), any()))
                .thenReturn(ImportBatchImportMode.IN_DAY);
        when(importBatchServicePort.create(any(CreateImportBatchRequest.class), eq(operatorId)))
                .thenReturn(ImportBatchResponse.builder()
                        .id(50L)
                        .batchCode("IB-50")
                        .drawDate(drawDate)
                        .lines(List.of(ImportBatchLineResponse.builder()
                                .id(501L)
                                .lotteryStationId(10L)
                                .declareQuantity(1)
                                .build()))
                        .build());
        when(lotteryTicketServicePort.create(any(CreateLotteryTicketRequest.class), eq(operatorId)))
                .thenThrow(new DomainException(ErrorCode.INVALID_INPUT, "Vé lỗi"));

        assertThatThrownBy(() -> service.confirm(
                OcrConfirmImportRequest.builder()
                        .mode(OcrConfirmImportMode.AUTO)
                        .supplierId(7L)
                        .invoiceEvidenceUrl("https://example.com/invoice.jpg")
                        .tickets(List.of(ticket(10L, drawDate, "123456", "A012345")))
                        .build(),
                operatorId
        ))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertThat(((DomainException) ex).getInternalMessage())
                        .contains("Nhập vé thất bại"));

        verify(transactionManager).rollback(any());
    }

    @Test
    void manualRejectsDrawDateMismatch() {
        ImportBatchModel batch = ImportBatchModel.builder()
                .id(80L)
                .batchCode("IB-80")
                .drawDate(drawDate)
                .supplierId(7L)
                .status(ImportBatchStatus.DRAFT)
                .importedBy(operatorId)
                .build();
        when(importBatchRepositoryPort.findById(80L)).thenReturn(Optional.of(batch));

        assertThatThrownBy(() -> service.confirm(
                OcrConfirmImportRequest.builder()
                        .mode(OcrConfirmImportMode.MANUAL)
                        .importBatchId(80L)
                        .tickets(List.of(ticket(10L, drawDate.plusDays(1), "123456", "A012345")))
                        .build(),
                operatorId
        ))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertThat(((DomainException) ex).getInternalMessage())
                        .contains("không khớp phiếu nhập"));

        verify(importBatchServicePort, never()).ensureOpenLinesByStation(any(), any(), any());
        verify(lotteryTicketServicePort, never()).create(any(), any());
    }

    @Test
    void manualEnsuresLinesThenImportsTickets() {
        ImportBatchModel batch = ImportBatchModel.builder()
                .id(80L)
                .batchCode("IB-80")
                .drawDate(drawDate)
                .supplierId(7L)
                .status(ImportBatchStatus.DRAFT)
                .importedBy(operatorId)
                .build();
        when(importBatchRepositoryPort.findById(80L)).thenReturn(Optional.of(batch));
        when(importBatchServicePort.ensureOpenLinesByStation(eq(80L), any(), eq(operatorId)))
                .thenReturn(Map.of(10L, 801L));
        when(lotteryTicketServicePort.create(any(CreateLotteryTicketRequest.class), eq(operatorId)))
                .thenReturn(LotteryTicketResponse.builder()
                        .id(900L)
                        .serials(List.of(LotteryTicketSerialResponse.builder()
                                .id(901L)
                                .serialNumber("A012345")
                                .build()))
                        .build());

        OcrConfirmImportResponse response = service.confirm(
                OcrConfirmImportRequest.builder()
                        .mode(OcrConfirmImportMode.MANUAL)
                        .importBatchId(80L)
                        .tickets(List.of(ticket(10L, drawDate, "123456", "A012345")))
                        .build(),
                operatorId
        );

        assertThat(response.mode()).isEqualTo(OcrConfirmImportMode.MANUAL);
        assertThat(response.successCount()).isEqualTo(1);
        assertThat(response.batches().getFirst().importBatchId()).isEqualTo(80L);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<Long, Integer>> declareCaptor = ArgumentCaptor.forClass(Map.class);
        verify(importBatchServicePort).ensureOpenLinesByStation(eq(80L), declareCaptor.capture(), eq(operatorId));
        assertThat(declareCaptor.getValue()).containsEntry(10L, 1);

        ArgumentCaptor<CreateLotteryTicketRequest> ticketCaptor =
                ArgumentCaptor.forClass(CreateLotteryTicketRequest.class);
        verify(lotteryTicketServicePort).create(ticketCaptor.capture(), eq(operatorId));
        assertThat(ticketCaptor.getValue().importBatchLineId()).isEqualTo(801L);
    }

    private static OcrConfirmImportTicketRequest ticket(
            Long stationId,
            LocalDate drawDate,
            String numbers,
            String serial
    ) {
        return OcrConfirmImportTicketRequest.builder()
                .stationId(stationId)
                .drawDate(drawDate)
                .numbers(numbers)
                .serialNumber(serial)
                .build();
    }
}
