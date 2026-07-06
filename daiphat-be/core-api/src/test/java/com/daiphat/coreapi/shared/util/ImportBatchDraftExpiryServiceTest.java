package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchCancelReason;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
class ImportBatchDraftExpiryServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 7, 6);
    private static final LocalDate YESTERDAY = TODAY.minusDays(1);
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock
    private ImportBatchConfigResolver importBatchConfigResolver;

    private Clock clock;
    private ImportBatchDraftExpiryService service;

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(Instant.parse("2026-07-06T15:30:00+07:00"), ZONE);
        service = new ImportBatchDraftExpiryService(importBatchRepositoryPort, importBatchConfigResolver, clock);
        when(importBatchConfigResolver.resolveImportBatchCutoff()).thenReturn(LocalTime.of(15, 0));
        when(importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(TODAY)).thenReturn(List.of());
    }

    @Test
    @DisplayName("cancels same-day IN_DAY draft after cutoff with deadline reason")
    void cancelOverdueDrafts_cancelsInDayDraftAfterCutoff() {
        ImportBatchModel batch = draftBatch(1L, TODAY, ImportBatchImportMode.IN_DAY);
        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of(batch));
        when(importBatchRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        int count = service.cancelOverdueDrafts();

        assertThat(count).isEqualTo(1);
        ArgumentCaptor<ImportBatchModel> captor = ArgumentCaptor.forClass(ImportBatchModel.class);
        verify(importBatchRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ImportBatchStatus.CANCELLED);
        assertThat(captor.getValue().getCancelReason()).isEqualTo(ImportBatchCancelReason.IMPORT_DEADLINE_PASSED);
    }

    @Test
    @DisplayName("cancels past draw date drafts regardless of import mode")
    void cancelOverdueDrafts_cancelsPastDrawDateDraft() {
        ImportBatchModel batch = draftBatch(2L, YESTERDAY, ImportBatchImportMode.POST_DRAW_SUPPLEMENT);
        when(importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(TODAY)).thenReturn(List.of(batch));
        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of());
        when(importBatchRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        int count = service.cancelOverdueDrafts();

        assertThat(count).isEqualTo(1);
        ArgumentCaptor<ImportBatchModel> captor = ArgumentCaptor.forClass(ImportBatchModel.class);
        verify(importBatchRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getCancelReason()).isEqualTo(ImportBatchCancelReason.DRAW_DATE_EXPIRED);
        verify(importBatchRepositoryPort).findDraftInDayBatchesByDrawDate(TODAY);
    }

    @Test
    @DisplayName("does not cancel same-day IN_DAY draft before cutoff")
    void cancelOverdueDrafts_beforeCutoff_noSameDayCancel() {
        clock = Clock.fixed(Instant.parse("2026-07-06T14:00:00+07:00"), ZONE);
        service = new ImportBatchDraftExpiryService(importBatchRepositoryPort, importBatchConfigResolver, clock);
        when(importBatchRepositoryPort.findDraftBatchesWithDrawDateBefore(TODAY)).thenReturn(List.of());

        int count = service.cancelOverdueDrafts();

        assertThat(count).isZero();
        verify(importBatchRepositoryPort, never()).findDraftInDayBatchesByDrawDate(any());
        verify(importBatchRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("does not cancel same-day POST_DRAW_SUPPLEMENT draft after cutoff")
    void cancelOverdueDrafts_skipsAdditionalModeAfterCutoff() {
        when(importBatchRepositoryPort.findDraftInDayBatchesByDrawDate(TODAY)).thenReturn(List.of());

        int count = service.cancelOverdueDrafts();

        assertThat(count).isZero();
        verify(importBatchRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("cancelIfOverdue cancels eligible same-day batch on ticket import path")
    void cancelIfOverdue_cancelsEligibleBatch() {
        ImportBatchModel batch = draftBatch(3L, TODAY, ImportBatchImportMode.IN_DAY);
        when(importBatchRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        boolean cancelled = service.cancelIfOverdue(batch);

        assertThat(cancelled).isTrue();
        assertThat(batch.getStatus()).isEqualTo(ImportBatchStatus.CANCELLED);
        assertThat(batch.getCancelReason()).isEqualTo(ImportBatchCancelReason.IMPORT_DEADLINE_PASSED);
    }

    @Test
    @DisplayName("cancelIfOverdue cancels past draw date batch")
    void cancelIfOverdue_cancelsPastDrawDate() {
        ImportBatchModel batch = draftBatch(4L, YESTERDAY, ImportBatchImportMode.IN_DAY);
        when(importBatchRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        boolean cancelled = service.cancelIfOverdue(batch);

        assertThat(cancelled).isTrue();
        assertThat(batch.getCancelReason()).isEqualTo(ImportBatchCancelReason.DRAW_DATE_EXPIRED);
    }

    @Test
    @DisplayName("cancelIfOverdue skips same-day additional import mode")
    void cancelIfOverdue_skipsAdditionalMode() {
        ImportBatchModel batch = draftBatch(5L, TODAY, ImportBatchImportMode.POST_DRAW_SUPPLEMENT);

        boolean cancelled = service.cancelIfOverdue(batch);

        assertThat(cancelled).isFalse();
        verify(importBatchRepositoryPort, never()).save(any());
    }

    private ImportBatchModel draftBatch(Long id, LocalDate drawDate, ImportBatchImportMode importMode) {
        return ImportBatchModel.builder()
                .id(id)
                .drawDate(drawDate)
                .importMode(importMode)
                .status(ImportBatchStatus.DRAFT)
                .build();
    }
}
