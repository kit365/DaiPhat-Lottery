package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReturnBatchAutoGenerationService")
class ReturnBatchAutoGenerationServiceTest {

    private static final LocalDate DRAW_DATE = LocalDate.of(2026, 7, 31);
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock
    private ReturnBatchRepositoryPort returnBatchRepositoryPort;
    @Mock
    private SupplierSettlementServicePort supplierSettlementServicePort;
    @Mock
    private ImportBatchConfigResolver importBatchConfigResolver;
    @Mock
    private ReturnBatchSummaryCalculator returnBatchSummaryCalculator;
    @Mock
    private Clock clock;
    @Mock
    private PlatformTransactionManager transactionManager;

    private ReturnBatchAutoGenerationService service;

    private LotterySupplierModel minhChinh;
    private LotterySupplierModel minhNgoc;

    @BeforeEach
    void setUp() {
        when(transactionManager.getTransaction(any(TransactionDefinition.class)))
                .thenReturn(new SimpleTransactionStatus());
        org.mockito.Mockito.doNothing().when(transactionManager).commit(any());
        org.mockito.Mockito.doNothing().when(transactionManager).rollback(any());

        service = new ReturnBatchAutoGenerationService(
                lotterySupplierRepositoryPort,
                importBatchRepositoryPort,
                importBatchLineRepositoryPort,
                returnBatchRepositoryPort,
                supplierSettlementServicePort,
                importBatchConfigResolver,
                returnBatchSummaryCalculator,
                clock,
                transactionManager
        );

        minhChinh = LotterySupplierModel.builder()
                .id(1L)
                .name("Minh Chinh")
                .code("MC")
                .returnCutOffTime(LocalTime.of(16, 0))
                .build();
        minhNgoc = LotterySupplierModel.builder()
                .id(2L)
                .name("Minh Ngoc")
                .code("MN")
                .returnCutOffTime(LocalTime.of(16, 0))
                .build();

        // 15:20 local — trigger is 16:00 - 45min = 15:15
        when(clock.instant()).thenReturn(Instant.parse("2026-07-31T08:20:00Z"));
        when(clock.getZone()).thenReturn(ZONE);
        when(importBatchConfigResolver.resolveReturnBufferMinutes()).thenReturn(45);
    }

    @Test
    @DisplayName("creates one return batch per supplier with import batches that day")
    void generate_oneBatchPerSupplier() {
        when(lotterySupplierRepositoryPort.findAllActive()).thenReturn(List.of(minhChinh, minhNgoc));
        when(importBatchRepositoryPort.existsNonCancelledBySupplierAndDrawDate(1L, DRAW_DATE)).thenReturn(true);
        when(importBatchRepositoryPort.existsNonCancelledBySupplierAndDrawDate(2L, DRAW_DATE)).thenReturn(true);
        when(importBatchLineRepositoryPort.findEligibleStationIdsBySupplierAndDrawDate(1L, DRAW_DATE))
                .thenReturn(List.of(10L, 11L));
        when(importBatchLineRepositoryPort.findEligibleStationIdsBySupplierAndDrawDate(2L, DRAW_DATE))
                .thenReturn(List.of(20L));
        when(returnBatchRepositoryPort.findBySupplierAndDrawDate(any(), eq(DRAW_DATE)))
                .thenReturn(Optional.empty());
        when(supplierSettlementServicePort.findOrCreateForImport(any(), eq(DRAW_DATE)))
                .thenAnswer(inv -> {
                    LotterySupplierModel s = inv.getArgument(0);
                    return SupplierSettlementModel.builder()
                            .id(s.getId() + 100)
                            .lotterySupplierId(s.getId())
                            .periodFrom(DRAW_DATE)
                            .build();
                });

        AtomicInteger idSeq = new AtomicInteger(50);
        when(returnBatchRepositoryPort.save(any())).thenAnswer(inv -> {
            ReturnBatchModel model = inv.getArgument(0);
            model.setId((long) idSeq.getAndIncrement());
            return model;
        });
        when(returnBatchRepositoryPort.saveLine(any())).thenAnswer(inv -> inv.getArgument(0));

        int created = service.generateDueReturnBatches();

        assertThat(created).isEqualTo(2);
        verify(returnBatchRepositoryPort, times(2)).save(any());
        verify(returnBatchRepositoryPort, times(3)).saveLine(any());
        verify(returnBatchSummaryCalculator, times(2)).recalculate(any());
        verify(supplierSettlementServicePort).findOrCreateForImport(minhChinh, DRAW_DATE);
        verify(supplierSettlementServicePort).findOrCreateForImport(minhNgoc, DRAW_DATE);
    }

    @Test
    @DisplayName("is idempotent when return batch already exists")
    void generate_skipsExistingBatch() {
        when(lotterySupplierRepositoryPort.findAllActive()).thenReturn(List.of(minhChinh));
        when(importBatchRepositoryPort.existsNonCancelledBySupplierAndDrawDate(1L, DRAW_DATE)).thenReturn(true);
        when(importBatchLineRepositoryPort.findEligibleStationIdsBySupplierAndDrawDate(1L, DRAW_DATE))
                .thenReturn(List.of(10L));
        when(returnBatchRepositoryPort.findBySupplierAndDrawDate(1L, DRAW_DATE))
                .thenReturn(Optional.of(ReturnBatchModel.builder()
                        .id(99L)
                        .lotterySupplierId(1L)
                        .drawDate(DRAW_DATE)
                        .status(ReturnBatchStatus.PENDING_INSPECTION)
                        .build()));
        when(returnBatchRepositoryPort.findLinesByBatchId(99L)).thenReturn(List.of(
                ReturnBatchLineModel.builder().id(1L).returnBatchId(99L).lotteryStationId(10L).build()
        ));

        int created = service.generateDueReturnBatches();

        assertThat(created).isZero();
        verify(returnBatchRepositoryPort, never()).save(any());
        verify(returnBatchSummaryCalculator).recalculate(99L);
    }

    @Test
    @DisplayName("does not create before returnCutOffTime - RETURN_BUFFER_TIME")
    void generate_skipsBeforeTrigger() {
        // 14:00 local — trigger is 15:15
        when(clock.instant()).thenReturn(Instant.parse("2026-07-31T07:00:00Z"));
        when(lotterySupplierRepositoryPort.findAllActive()).thenReturn(List.of(minhChinh));

        int created = service.generateDueReturnBatches();

        assertThat(created).isZero();
        verify(importBatchRepositoryPort, never()).existsNonCancelledBySupplierAndDrawDate(any(), any());
    }

    @Test
    @DisplayName("trigger time uses cutoff minus buffer")
    void isPastAutoCreateTrigger_bufferWindow() {
        LocalDateTime before = LocalDateTime.of(DRAW_DATE, LocalTime.of(15, 14));
        LocalDateTime at = LocalDateTime.of(DRAW_DATE, LocalTime.of(15, 15));
        LocalDateTime after = LocalDateTime.of(DRAW_DATE, LocalTime.of(15, 16));

        assertThat(ReturnBatchAutoGenerationService.isPastAutoCreateTrigger(
                LocalTime.of(16, 0), DRAW_DATE, before, 45)).isFalse();
        assertThat(ReturnBatchAutoGenerationService.isPastAutoCreateTrigger(
                LocalTime.of(16, 0), DRAW_DATE, at, 45)).isTrue();
        assertThat(ReturnBatchAutoGenerationService.isPastAutoCreateTrigger(
                LocalTime.of(16, 0), DRAW_DATE, after, 45)).isTrue();
    }

    @Test
    @DisplayName("enriches PENDING batch with missing stations on rerun")
    void generate_enrichesMissingStations() {
        when(lotterySupplierRepositoryPort.findAllActive()).thenReturn(List.of(minhChinh));
        when(importBatchRepositoryPort.existsNonCancelledBySupplierAndDrawDate(1L, DRAW_DATE)).thenReturn(true);
        when(importBatchLineRepositoryPort.findEligibleStationIdsBySupplierAndDrawDate(1L, DRAW_DATE))
                .thenReturn(List.of(10L, 11L));
        when(returnBatchRepositoryPort.findBySupplierAndDrawDate(1L, DRAW_DATE))
                .thenReturn(Optional.of(ReturnBatchModel.builder()
                        .id(99L)
                        .lotterySupplierId(1L)
                        .drawDate(DRAW_DATE)
                        .status(ReturnBatchStatus.PENDING_INSPECTION)
                        .build()));
        when(returnBatchRepositoryPort.findLinesByBatchId(99L)).thenReturn(List.of(
                ReturnBatchLineModel.builder().id(1L).returnBatchId(99L).lotteryStationId(10L).build()
        ));
        when(returnBatchRepositoryPort.saveLine(any())).thenAnswer(inv -> inv.getArgument(0));

        int created = service.generateDueReturnBatches();

        assertThat(created).isZero();
        ArgumentCaptor<ReturnBatchLineModel> lineCaptor = ArgumentCaptor.forClass(ReturnBatchLineModel.class);
        verify(returnBatchRepositoryPort).saveLine(lineCaptor.capture());
        assertThat(lineCaptor.getValue().getLotteryStationId()).isEqualTo(11L);
        verify(returnBatchRepositoryPort, never()).save(any());
    }
}
