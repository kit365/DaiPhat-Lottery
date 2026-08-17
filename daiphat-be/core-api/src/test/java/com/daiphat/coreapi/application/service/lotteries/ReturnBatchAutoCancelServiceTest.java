package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
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

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReturnBatchAutoCancelService")
class ReturnBatchAutoCancelServiceTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate DRAW_DATE = LocalDate.of(2026, 8, 17);

    @Mock
    private ReturnBatchRepositoryPort returnBatchRepositoryPort;
    @Mock
    private LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    @Mock
    private SupplierSettlementServicePort supplierSettlementServicePort;
    @Mock
    private Clock clock;

    @InjectMocks
    private ReturnBatchAutoCancelService service;

    @BeforeEach
    void setUp() {
        // 17/08/2026 14:31 Asia/Ho_Chi_Minh
        when(clock.instant()).thenReturn(Instant.parse("2026-08-17T07:31:00Z"));
        when(clock.getZone()).thenReturn(ZONE);
        when(returnBatchRepositoryPort.save(any(ReturnBatchModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(returnBatchRepositoryPort.saveLine(any(ReturnBatchLineModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("cancels open lines when auto-cancelling a batch past cutoff")
    void cancelIfPastCutoff_cancelsBatchAndLines() {
        ReturnBatchModel batch = openBatch(10L, ReturnBatchStatus.PENDING_INSPECTION);
        ReturnBatchLineModel pending = line(100L, ReturnBatchLineStatus.PENDING);
        ReturnBatchLineModel inspecting = line(101L, ReturnBatchLineStatus.INSPECTING);
        ReturnBatchLineModel inspected = line(102L, ReturnBatchLineStatus.INSPECTED);
        when(returnBatchRepositoryPort.findLinesByBatchId(10L))
                .thenReturn(List.of(pending, inspecting, inspected));

        boolean cancelled = service.cancelIfPastCutoff(batch);

        assertThat(cancelled).isTrue();
        assertThat(batch.getStatus()).isEqualTo(ReturnBatchStatus.CANCELLED);
        assertThat(batch.getCancelReason()).isEqualTo(ReturnBatchCancelReason.CUTOFF_EXCEEDED);
        verify(returnBatchRepositoryPort).save(batch);

        ArgumentCaptor<ReturnBatchLineModel> lineCaptor = ArgumentCaptor.forClass(ReturnBatchLineModel.class);
        verify(returnBatchRepositoryPort, org.mockito.Mockito.times(3)).saveLine(lineCaptor.capture());
        assertThat(lineCaptor.getAllValues())
                .extracting(ReturnBatchLineModel::getStatus)
                .containsOnly(ReturnBatchLineStatus.CANCELLED);
    }

    @Test
    @DisplayName("heals leftover open lines on an already cancelled batch")
    void cancelIfPastCutoff_healsLinesOnCancelledBatch() {
        ReturnBatchModel batch = ReturnBatchModel.builder()
                .id(11L)
                .lotterySupplierId(7L)
                .drawDate(DRAW_DATE)
                .status(ReturnBatchStatus.CANCELLED)
                .returnCutOffTime(LocalTime.of(14, 30))
                .build();
        ReturnBatchLineModel leftover = line(200L, ReturnBatchLineStatus.PENDING);
        ReturnBatchLineModel alreadyCancelled = line(201L, ReturnBatchLineStatus.CANCELLED);
        when(returnBatchRepositoryPort.findLinesByBatchId(11L))
                .thenReturn(List.of(leftover, alreadyCancelled));

        boolean cancelled = service.cancelIfPastCutoff(batch);

        assertThat(cancelled).isFalse();
        verify(returnBatchRepositoryPort, never()).save(batch);
        verify(returnBatchRepositoryPort).saveLine(leftover);
        assertThat(leftover.getStatus()).isEqualTo(ReturnBatchLineStatus.CANCELLED);
        verify(returnBatchRepositoryPort, never()).saveLine(alreadyCancelled);
    }

    @Test
    @DisplayName("does not cancel batch or lines before cutoff")
    void cancelIfPastCutoff_beforeCutoff_doesNothing() {
        when(clock.instant()).thenReturn(Instant.parse("2026-08-17T07:00:00Z"));
        ReturnBatchModel batch = openBatch(12L, ReturnBatchStatus.INSPECTING);
        when(returnBatchRepositoryPort.findLinesByBatchId(12L))
                .thenReturn(List.of(line(300L, ReturnBatchLineStatus.PENDING)));

        boolean cancelled = service.cancelIfPastCutoff(batch);

        assertThat(cancelled).isFalse();
        assertThat(batch.getStatus()).isEqualTo(ReturnBatchStatus.INSPECTING);
        verify(returnBatchRepositoryPort, never()).save(any());
        verify(returnBatchRepositoryPort, never()).saveLine(any());
    }

    @Test
    @DisplayName("skips seed return batches so settlement QA inventory stays inspectable")
    void cancelIfPastCutoff_skipsSeedReturnNotes() {
        ReturnBatchModel batch = openBatch(14L, ReturnBatchStatus.PENDING_INSPECTION);
        batch.setNote("SEED-RETURN-SETTLE-DOI_SOAT_QA-" + DRAW_DATE);

        boolean cancelled = service.cancelIfPastCutoff(batch);

        assertThat(cancelled).isFalse();
        assertThat(batch.getStatus()).isEqualTo(ReturnBatchStatus.PENDING_INSPECTION);
        verify(returnBatchRepositoryPort, never()).save(any());
        verify(returnBatchRepositoryPort, never()).saveLine(any());
    }

    @Test
    @DisplayName("scheduler also heals lines of batches that were already cancelled")
    void cancelExpiredOpenBatches_healsExistingCancelledBatches() {
        ReturnBatchModel alreadyCancelled = ReturnBatchModel.builder()
                .id(13L)
                .lotterySupplierId(7L)
                .drawDate(DRAW_DATE)
                .status(ReturnBatchStatus.CANCELLED)
                .returnCutOffTime(LocalTime.of(14, 30))
                .build();
        ReturnBatchLineModel leftover = line(400L, ReturnBatchLineStatus.PENDING);
        when(returnBatchRepositoryPort.findByStatuses(List.of(
                ReturnBatchStatus.PENDING_INSPECTION,
                ReturnBatchStatus.INSPECTING
        ))).thenReturn(List.of());
        when(returnBatchRepositoryPort.findByStatuses(List.of(ReturnBatchStatus.CANCELLED)))
                .thenReturn(List.of(alreadyCancelled));
        when(returnBatchRepositoryPort.findLinesByBatchId(13L)).thenReturn(List.of(leftover));

        int cancelled = service.cancelExpiredOpenBatches();

        assertThat(cancelled).isZero();
        assertThat(leftover.getStatus()).isEqualTo(ReturnBatchLineStatus.CANCELLED);
        verify(returnBatchRepositoryPort).saveLine(leftover);
    }

    private static ReturnBatchModel openBatch(Long id, ReturnBatchStatus status) {
        return ReturnBatchModel.builder()
                .id(id)
                .lotterySupplierId(7L)
                .drawDate(DRAW_DATE)
                .supplierSettlementId(50L)
                .status(status)
                .returnCutOffTime(LocalTime.of(14, 30))
                .build();
    }

    private static ReturnBatchLineModel line(Long id, ReturnBatchLineStatus status) {
        return ReturnBatchLineModel.builder()
                .id(id)
                .returnBatchId(10L)
                .lotteryStationId(1L)
                .status(status)
                .build();
    }
}
