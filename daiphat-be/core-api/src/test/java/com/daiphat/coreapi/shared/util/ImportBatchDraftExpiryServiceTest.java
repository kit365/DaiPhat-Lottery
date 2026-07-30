package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ImportBatchDraftExpiryServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 7, 6);
    private static final LocalDate YESTERDAY = TODAY.minusDays(1);
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Long STATION_A_ID = 10L;
    private static final Long STATION_B_ID = 20L;

    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock
    private LotteryStationServicePort lotteryStationServicePort;

    private Clock clock;
    private ImportBatchDraftExpiryService service;

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(Instant.parse("2026-07-06T15:30:00+07:00"), ZONE);
        service = new ImportBatchDraftExpiryService(
                importBatchRepositoryPort,
                importBatchLineRepositoryPort,
                lotteryStationServicePort,
                clock
        );
        when(importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(TODAY)).thenReturn(List.of());
        when(lotteryStationServicePort.getModelById(STATION_A_ID))
                .thenReturn(station(STATION_A_ID, "Sóc Trăng"));
        when(lotteryStationServicePort.getModelById(STATION_B_ID))
                .thenReturn(station(STATION_B_ID, "Cần Thơ"));
        when(importBatchLineRepositoryPort.save(any(ImportBatchLineModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("does not cancel same-day IN_DAY drafts after former cutoff window")
    void cancelOverdueDrafts_doesNotCancelSameDayInDayDraft() {
        ImportBatchLineModel lineA = openLine(1L, STATION_A_ID);
        ImportBatchLineModel lineB = openLine(2L, STATION_B_ID);
        ImportBatchModel batch = draftBatch(1L, TODAY, ImportBatchImportMode.IN_DAY, lineA, lineB);

        when(importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(TODAY)).thenReturn(List.of());

        int count = service.cancelOverdueDrafts();

        assertThat(count).isEqualTo(0);
        assertThat(lineA.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        assertThat(lineB.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        verify(importBatchLineRepositoryPort, never()).save(any(ImportBatchLineModel.class));
    }

    @Test
    @DisplayName("cancels past draw date IN_DAY lines with station-specific reason")
    void cancelOverdueDrafts_cancelsPastDrawDateDraft() {
        ImportBatchLineModel line = openLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(2L, YESTERDAY, ImportBatchImportMode.IN_DAY, line);

        when(importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(TODAY)).thenReturn(List.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(2L)).thenReturn(List.of(line));

        int count = service.cancelOverdueDrafts();

        assertThat(count).isEqualTo(1);
        assertThat(line.getCancelReason())
                .isEqualTo(ImportBatchLineCancelReason.drawDateExpired("Sóc Trăng"));
        assertThat(batch.getCancelReason()).isEqualTo(ImportBatchCancelReason.ALL_LINES_CANCELLED);
    }

    @Test
    @DisplayName("does not cancel POST_DRAW_SUPPLEMENT batch with past draw date")
    void cancelOverdueDrafts_skipsPostDrawSupplementPastDrawDate() {
        ImportBatchLineModel line = adjustmentLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(8L, YESTERDAY, ImportBatchImportMode.POST_DRAW_SUPPLEMENT, line);

        when(importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(TODAY)).thenReturn(List.of(batch));

        int count = service.cancelOverdueDrafts();

        assertThat(count).isZero();
        assertThat(line.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        verify(importBatchLineRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("does not cancel same-day IN_DAY batch (cutoff-based expiry removed)")
    void cancelOverdueDrafts_skipsSameDayInDayBatch() {
        ImportBatchLineModel adjustmentLine = adjustmentLine(1L, STATION_A_ID);
        ImportBatchLineModel openLine = openLine(2L, STATION_B_ID);
        ImportBatchModel batch = draftBatch(9L, TODAY, ImportBatchImportMode.IN_DAY, adjustmentLine, openLine);

        when(importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(TODAY)).thenReturn(List.of());

        int count = service.cancelOverdueDrafts();

        assertThat(count).isZero();
        assertThat(adjustmentLine.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        assertThat(openLine.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        verify(importBatchLineRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("partial cancel on past-date batch completes when remaining lines are imported")
    void cancelOverdueDrafts_partialCancel_batchCompletesWhenRemainingLinesImported() {
        ImportBatchLineModel importedLine = importedLine(1L, STATION_A_ID);
        ImportBatchLineModel openLine = openLine(2L, STATION_B_ID);
        ImportBatchModel batch = draftBatch(
                3L,
                YESTERDAY,
                ImportBatchImportMode.IN_DAY,
                importedLine,
                openLine
        );
        batch.setStatus(ImportBatchStatus.RECEIVING);

        when(importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(TODAY)).thenReturn(List.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(3L))
                .thenReturn(List.of(importedLine, openLine));

        int count = service.cancelOverdueDrafts();

        assertThat(count).isZero();
        assertThat(importedLine.getStatus()).isEqualTo(ImportBatchLineStatus.IMPORTED);
        assertThat(openLine.getStatus()).isEqualTo(ImportBatchLineStatus.CANCELLED);
        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.IMPORTED);
        verify(importBatchRepositoryPort).save(batch);
    }

    @Test
    @DisplayName("same-day drafts are not scanned for time-based expiry")
    void cancelOverdueDrafts_sameDay_noTimeBasedScan() {
        int count = service.cancelOverdueDrafts();

        assertThat(count).isZero();
        verify(importBatchLineRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("cancelIfOverdue does not cancel same-day IN_DAY batch")
    void cancelIfOverdue_skipsSameDayInDayBatch() {
        ImportBatchLineModel line = openLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(4L, TODAY, ImportBatchImportMode.IN_DAY, line);
        when(importBatchLineRepositoryPort.findByImportBatchId(4L)).thenReturn(List.of(line));

        boolean cancelled = service.cancelIfOverdue(batch);

        assertThat(cancelled).isFalse();
        assertThat(line.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.DRAFT);
    }

    @Test
    @DisplayName("cancelIfOverdue cancels past draw date lines")
    void cancelIfOverdue_cancelsPastDrawDate() {
        ImportBatchLineModel line = openLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(5L, YESTERDAY, ImportBatchImportMode.IN_DAY, line);
        when(importBatchLineRepositoryPort.findByImportBatchId(5L)).thenReturn(List.of(line));

        boolean cancelled = service.cancelIfOverdue(batch);

        assertThat(cancelled).isTrue();
        assertThat(line.getCancelReason())
                .isEqualTo(ImportBatchLineCancelReason.drawDateExpired("Sóc Trăng"));
    }

    @Test
    @DisplayName("cancelIfOverdue skips same-day additional import mode")
    void cancelIfOverdue_skipsAdditionalMode() {
        ImportBatchLineModel line = openLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(6L, TODAY, ImportBatchImportMode.POST_DRAW_SUPPLEMENT, line);

        boolean cancelled = service.cancelIfOverdue(batch);

        assertThat(cancelled).isFalse();
        assertThat(line.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        verify(importBatchLineRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("imported lines are never auto-cancelled")
    void cancelIfOverdue_doesNotCancelImportedLines() {
        ImportBatchLineModel importedLine = importedLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(7L, YESTERDAY, ImportBatchImportMode.IN_DAY, importedLine);
        when(importBatchLineRepositoryPort.findByImportBatchId(7L)).thenReturn(List.of(importedLine));

        boolean cancelled = service.cancelIfOverdue(batch);

        assertThat(cancelled).isFalse();
        assertThat(importedLine.getStatus()).isEqualTo(ImportBatchLineStatus.IMPORTED);
        verify(importBatchLineRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("cancelIfOverdue skips POST_DRAW_SUPPLEMENT batch with past draw date")
    void cancelIfOverdue_skipsPostDrawSupplementPastDrawDate() {
        ImportBatchLineModel line = adjustmentLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(10L, YESTERDAY, ImportBatchImportMode.POST_DRAW_SUPPLEMENT, line);

        boolean cancelled = service.cancelIfOverdue(batch);

        assertThat(cancelled).isFalse();
        assertThat(line.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        verify(importBatchLineRepositoryPort, never()).save(any());
    }

    private ImportBatchLineModel adjustmentLine(Long id, Long stationId) {
        return ImportBatchLineModel.builder()
                .id(id)
                .importBatchId(1L)
                .lotteryStationId(stationId)
                .batchType(ImportBatchType.ADJUSTMENT)
                .declareQuantity(10)
                .totalQuantity(0)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.OPEN)
                .build();
    }

    private ImportBatchModel draftBatch(
            Long id,
            LocalDate drawDate,
            ImportBatchImportMode importMode,
            ImportBatchLineModel... lines
    ) {
        return ImportBatchModel.builder()
                .id(id)
                .drawDate(drawDate)
                .importMode(importMode)
                .status(ImportBatchStatus.DRAFT)
                .lines(new ArrayList<>(List.of(lines)))
                .build();
    }

    private ImportBatchLineModel openLine(Long id, Long stationId) {
        return ImportBatchLineModel.builder()
                .id(id)
                .importBatchId(1L)
                .lotteryStationId(stationId)
                .declareQuantity(10)
                .totalQuantity(0)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.OPEN)
                .build();
    }

    private ImportBatchLineModel importedLine(Long id, Long stationId) {
        return ImportBatchLineModel.builder()
                .id(id)
                .importBatchId(1L)
                .lotteryStationId(stationId)
                .declareQuantity(10)
                .totalQuantity(10)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.IMPORTED)
                .build();
    }

    private LotteryStationModel station(Long id, String name) {
        return LotteryStationModel.builder()
                .id(id)
                .name(name)
                .isActive(true)
                .build();
    }
}
