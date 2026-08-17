package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
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
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
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
    private static final Long SUPPLIER_ID = 100L;
    private static final UUID IMPORTER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID ADMIN_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock
    private LotteryStationServicePort lotteryStationServicePort;
    @Mock
    private LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    @Mock
    private SupplierTicketIntakeWindowPolicy intakeWindowPolicy;
    @Mock
    private LotteryTicketServicePort lotteryTicketServicePort;
    @Mock
    private NotificationServicePort notificationService;
    @Mock
    private UserRepositoryPort userRepositoryPort;

    private Clock clock;
    private ImportBatchDraftExpiryService service;

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(Instant.parse("2026-07-06T15:30:00+07:00"), ZONE);
        service = new ImportBatchDraftExpiryService(
                importBatchRepositoryPort,
                importBatchLineRepositoryPort,
                lotteryStationServicePort,
                lotterySupplierRepositoryPort,
                intakeWindowPolicy,
                lotteryTicketServicePort,
                notificationService,
                userRepositoryPort,
                clock
        );
        when(importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(TODAY)).thenReturn(List.of());
        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of());
        when(lotteryStationServicePort.getModelById(STATION_A_ID))
                .thenReturn(station(STATION_A_ID, "Sóc Trăng"));
        when(lotteryStationServicePort.getModelById(STATION_B_ID))
                .thenReturn(station(STATION_B_ID, "Cần Thơ"));
        when(lotterySupplierRepositoryPort.findById(SUPPLIER_ID))
                .thenReturn(Optional.of(supplier(SUPPLIER_ID, LocalTime.of(16, 0))));
        when(importBatchLineRepositoryPort.save(any(ImportBatchLineModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchRepositoryPort.save(any(ImportBatchModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepositoryPort.findAllByRoleCodes(any())).thenReturn(List.of(
                UserModel.builder().id(ADMIN_ID).status(UserStatus.ACTIVE).build()
        ));
        when(notificationService.createNotification(any(NotificationModel.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("does not cancel same-day IN_DAY drafts before intake closes")
    void cancelOverdueDrafts_doesNotCancelSameDayBeforeIntakeClosed() {
        ImportBatchLineModel lineA = openLine(1L, STATION_A_ID);
        ImportBatchLineModel lineB = openLine(2L, STATION_B_ID);
        ImportBatchModel batch = draftBatch(1L, TODAY, ImportBatchImportMode.IN_DAY, lineA, lineB);

        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of(batch));
        when(intakeWindowPolicy.isIntakeClosed(any(), eq(TODAY), any())).thenReturn(false);

        int count = service.cancelOverdueDrafts();

        assertThat(count).isEqualTo(0);
        assertThat(lineA.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        assertThat(lineB.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        verify(importBatchLineRepositoryPort, never()).save(any(ImportBatchLineModel.class));
        verify(lotteryTicketServicePort, never()).purgeImportBatchLineTickets(anyLong());
    }

    @Test
    @DisplayName("cancels same-day IN_DAY open lines when intake is closed")
    void cancelOverdueDrafts_cancelsSameDayWhenIntakeClosed() {
        ImportBatchLineModel line = openLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(11L, TODAY, ImportBatchImportMode.IN_DAY, line);

        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(11L)).thenReturn(List.of(line));
        when(intakeWindowPolicy.isIntakeClosed(any(), eq(TODAY), any())).thenReturn(true);

        int count = service.cancelOverdueDrafts();

        assertThat(count).isEqualTo(1);
        assertThat(line.getStatus()).isEqualTo(ImportBatchLineStatus.CANCELLED);
        assertThat(line.getCancelReason())
                .isEqualTo(ImportBatchLineCancelReason.importDeadlinePassed("Sóc Trăng"));
        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.CANCELLED);
        verify(lotteryTicketServicePort).purgeImportBatchLineTickets(1L);
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
        verify(lotteryTicketServicePort).purgeImportBatchLineTickets(1L);
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
        verify(lotteryTicketServicePort, never()).purgeImportBatchLineTickets(anyLong());
    }

    @Test
    @DisplayName("same-day: cancels OPEN line but skips ADJUSTMENT line")
    void cancelOverdueDrafts_sameDaySkipsAdjustmentLine() {
        ImportBatchLineModel adjustmentLine = adjustmentLine(1L, STATION_A_ID);
        ImportBatchLineModel openLine = openLine(2L, STATION_B_ID);
        ImportBatchModel batch = draftBatch(9L, TODAY, ImportBatchImportMode.IN_DAY, adjustmentLine, openLine);

        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(9L))
                .thenReturn(List.of(adjustmentLine, openLine));
        when(intakeWindowPolicy.isIntakeClosed(any(), eq(TODAY), any())).thenReturn(true);

        int count = service.cancelOverdueDrafts();

        assertThat(count).isZero();
        assertThat(adjustmentLine.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        assertThat(openLine.getStatus()).isEqualTo(ImportBatchLineStatus.CANCELLED);
        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.DRAFT);
        verify(lotteryTicketServicePort).purgeImportBatchLineTickets(2L);
        verify(lotteryTicketServicePort, never()).purgeImportBatchLineTickets(1L);
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
        verify(lotteryTicketServicePort).purgeImportBatchLineTickets(2L);
        verify(lotteryTicketServicePort, never()).purgeImportBatchLineTickets(1L);
    }

    @Test
    @DisplayName("same-day partial cancel keeps PARTIALLY_IMPORTED when one line already imported")
    void cancelOverdueDrafts_sameDayPartialCancel_keepsPartiallyImported() {
        ImportBatchLineModel importedLine = importedLine(1L, STATION_A_ID);
        ImportBatchLineModel openLine = openLine(2L, STATION_B_ID);
        ImportBatchModel batch = draftBatch(
                12L,
                TODAY,
                ImportBatchImportMode.IN_DAY,
                importedLine,
                openLine
        );
        batch.setStatus(ImportBatchStatus.PARTIALLY_IMPORTED);

        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(12L))
                .thenReturn(List.of(importedLine, openLine));
        when(intakeWindowPolicy.isIntakeClosed(any(), eq(TODAY), any())).thenReturn(true);

        int count = service.cancelOverdueDrafts();

        assertThat(count).isZero();
        assertThat(importedLine.getStatus()).isEqualTo(ImportBatchLineStatus.IMPORTED);
        assertThat(openLine.getStatus()).isEqualTo(ImportBatchLineStatus.CANCELLED);
        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.IMPORTED);
        verify(lotteryTicketServicePort).purgeImportBatchLineTickets(2L);
    }

    @Test
    @DisplayName("purges IMPORTING tickets when auto-cancelling IMPORTING line")
    void cancelOverdueDrafts_purgesImportingLineTickets() {
        ImportBatchLineModel line = ImportBatchLineModel.builder()
                .id(5L)
                .importBatchId(13L)
                .lotteryStationId(STATION_A_ID)
                .declareQuantity(10)
                .totalQuantity(3)
                .importCost(BigDecimal.valueOf(10000))
                .status(ImportBatchLineStatus.IMPORTING)
                .build();
        ImportBatchModel batch = draftBatch(13L, TODAY, ImportBatchImportMode.IN_DAY, line);

        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(13L)).thenReturn(List.of(line));
        when(intakeWindowPolicy.isIntakeClosed(any(), eq(TODAY), any())).thenReturn(true);

        int count = service.cancelOverdueDrafts();

        assertThat(count).isEqualTo(1);
        assertThat(line.getStatus()).isEqualTo(ImportBatchLineStatus.CANCELLED);
        verify(lotteryTicketServicePort).purgeImportBatchLineTickets(5L);
    }

    @Test
    @DisplayName("cancelIfOverdue cancels same-day IN_DAY batch after intake closes")
    void cancelIfOverdue_cancelsSameDayWhenIntakeClosed() {
        ImportBatchLineModel line = openLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(4L, TODAY, ImportBatchImportMode.IN_DAY, line);
        when(importBatchLineRepositoryPort.findByImportBatchId(4L)).thenReturn(List.of(line));
        when(intakeWindowPolicy.isIntakeClosed(any(), eq(TODAY), any())).thenReturn(true);

        boolean cancelled = service.cancelIfOverdue(batch);

        assertThat(cancelled).isTrue();
        assertThat(line.getStatus()).isEqualTo(ImportBatchLineStatus.CANCELLED);
        assertThat(line.getCancelReason())
                .isEqualTo(ImportBatchLineCancelReason.importDeadlinePassed("Sóc Trăng"));
        verify(lotteryTicketServicePort).purgeImportBatchLineTickets(1L);
    }

    @Test
    @DisplayName("cancelIfOverdue does not cancel same-day IN_DAY batch before intake closes")
    void cancelIfOverdue_skipsSameDayBeforeIntakeClosed() {
        ImportBatchLineModel line = openLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(4L, TODAY, ImportBatchImportMode.IN_DAY, line);
        when(importBatchLineRepositoryPort.findByImportBatchId(4L)).thenReturn(List.of(line));
        when(intakeWindowPolicy.isIntakeClosed(any(), eq(TODAY), any())).thenReturn(false);

        boolean cancelled = service.cancelIfOverdue(batch);

        assertThat(cancelled).isFalse();
        assertThat(line.getStatus()).isEqualTo(ImportBatchLineStatus.OPEN);
        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.DRAFT);
        verify(lotteryTicketServicePort, never()).purgeImportBatchLineTickets(anyLong());
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
        verify(lotteryTicketServicePort, never()).purgeImportBatchLineTickets(anyLong());
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

    @Test
    @DisplayName("sends in-app notification to importer and admins when batch is fully auto-cancelled")
    void cancelOverdueDrafts_sendsNotificationOnFullCancel() {
        ImportBatchLineModel line = openLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(11L, TODAY, ImportBatchImportMode.IN_DAY, line);
        batch.setBatchCode("PN-0011");
        batch.setImportedBy(IMPORTER_ID);
        batch.setSupplierName("NCC Test");

        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(11L)).thenReturn(List.of(line));
        when(intakeWindowPolicy.isIntakeClosed(any(), eq(TODAY), any())).thenReturn(true);

        service.cancelOverdueDrafts();

        ArgumentCaptor<NotificationModel> captor = ArgumentCaptor.forClass(NotificationModel.class);
        verify(notificationService, times(2)).createNotification(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(NotificationModel::getUserId)
                .containsExactlyInAnyOrder(IMPORTER_ID, ADMIN_ID);
        assertThat(captor.getAllValues().getFirst().getTitle())
                .isEqualTo("Phiếu nhập lô đã bị hủy tự động");
        assertThat(captor.getAllValues().getFirst().getReferenceId()).isEqualTo("11");
    }

    @Test
    @DisplayName("sends partial-cancel notification when some lines remain imported")
    void cancelOverdueDrafts_sendsNotificationOnPartialCancel() {
        ImportBatchLineModel importedLine = importedLine(1L, STATION_A_ID);
        ImportBatchLineModel openLine = openLine(2L, STATION_B_ID);
        ImportBatchModel batch = draftBatch(
                12L,
                TODAY,
                ImportBatchImportMode.IN_DAY,
                importedLine,
                openLine
        );
        batch.setStatus(ImportBatchStatus.PARTIALLY_IMPORTED);
        batch.setBatchCode("PN-0012");
        batch.setImportedBy(IMPORTER_ID);

        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(12L))
                .thenReturn(List.of(importedLine, openLine));
        when(intakeWindowPolicy.isIntakeClosed(any(), eq(TODAY), any())).thenReturn(true);

        service.cancelOverdueDrafts();

        ArgumentCaptor<NotificationModel> captor = ArgumentCaptor.forClass(NotificationModel.class);
        verify(notificationService, atLeastOnce()).createNotification(captor.capture());
        assertThat(captor.getAllValues().getFirst().getTitle())
                .isEqualTo("Một phần phiếu nhập lô đã bị hủy tự động");
        assertThat(captor.getAllValues().getFirst().getContent()).contains("1 dòng nhập");
    }

    @Test
    @DisplayName("does not notify when nothing is cancelled")
    void cancelOverdueDrafts_doesNotNotifyWhenNoCancel() {
        ImportBatchLineModel line = openLine(1L, STATION_A_ID);
        ImportBatchModel batch = draftBatch(1L, TODAY, ImportBatchImportMode.IN_DAY, line);
        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of(batch));
        when(intakeWindowPolicy.isIntakeClosed(any(), eq(TODAY), any())).thenReturn(false);

        service.cancelOverdueDrafts();

        verify(notificationService, never()).createNotification(any());
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
                .supplierId(SUPPLIER_ID)
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

    private LotterySupplierModel supplier(Long id, LocalTime returnCutOffTime) {
        return LotterySupplierModel.builder()
                .id(id)
                .name("NCC Test")
                .returnCutOffTime(returnCutOffTime)
                .isActive(true)
                .build();
    }
}
