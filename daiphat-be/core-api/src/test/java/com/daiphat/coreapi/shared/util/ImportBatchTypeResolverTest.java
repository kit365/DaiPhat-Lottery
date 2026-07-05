package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ImportBatchTypeResolver Unit Tests")
class ImportBatchTypeResolverTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TODAY = LocalDate.of(2026, 7, 6);
    private static final LocalDate TOMORROW = TODAY.plusDays(1);

    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock
    private ImportBatchConfigResolver importBatchConfigResolver;
    @Mock
    private Clock clock;

    @InjectMocks
    private ImportBatchTypeResolver resolver;

    private LotteryStationModel station;

    @BeforeEach
    void setUp() {
        station = LotteryStationModel.builder()
                .id(1L)
                .drawTime(LocalTime.of(16, 15))
                .drawDays(List.of(DayOfWeek.MONDAY))
                .build();
        when(importBatchConfigResolver.resolveLateImportTime()).thenReturn(LocalTime.of(14, 30));
        when(importBatchConfigResolver.resolveImportBatchCutoff()).thenReturn(LocalTime.of(15, 0));
    }

    @Test
    @DisplayName("POST_DRAW_SUPPLEMENT always returns ADJUSTMENT")
    void resolve_postDrawSupplement_returnsAdjustment() {
        fixedInstant(TODAY.atTime(10, 0));

        var result = resolver.resolve(1L, TODAY, station, ImportBatchImportMode.POST_DRAW_SUPPLEMENT);

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.ADJUSTMENT);
    }

    @Test
    @DisplayName("past draw date returns ADJUSTMENT")
    void resolve_pastDrawDate_returnsAdjustment() {
        fixedInstant(TODAY.atTime(10, 0));

        var result = resolver.resolve(1L, TODAY.minusDays(3), station, ImportBatchImportMode.IN_DAY);

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.ADJUSTMENT);
    }

    @Test
    @DisplayName("today after cutoff returns ADJUSTMENT for IN_DAY")
    void resolve_todayAfterCutoff_returnsAdjustment() {
        fixedInstant(TODAY.atTime(15, 30));

        var result = resolver.resolve(1L, TODAY, station, ImportBatchImportMode.IN_DAY);

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.ADJUSTMENT);
    }

    @Test
    @DisplayName("tomorrow returns NEW when no prior non-draft import")
    void resolve_tomorrow_returnsNew() {
        fixedInstant(TODAY.atTime(10, 0));
        when(importBatchLineRepositoryPort.existsNonDraftLineForStationAndDrawDate(1L, TOMORROW))
                .thenReturn(false);

        var result = resolver.resolve(1L, TOMORROW, station, ImportBatchImportMode.IN_DAY);

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.NEW);
    }

    @Test
    @DisplayName("tomorrow returns SUPPLEMENTARY when non-draft line exists")
    void resolve_tomorrow_returnsSupplementary() {
        fixedInstant(TODAY.atTime(10, 0));
        when(importBatchLineRepositoryPort.existsNonDraftLineForStationAndDrawDate(1L, TOMORROW))
                .thenReturn(true);

        var result = resolver.resolve(1L, TOMORROW, station, ImportBatchImportMode.IN_DAY);

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.SUPPLEMENTARY);
    }

    @Test
    @DisplayName("IN_DAY returns LATE_IMPORT during late window")
    void resolve_inDayLateWindow_returnsLateImport() {
        fixedInstant(TODAY.atTime(14, 45));

        var result = resolver.resolve(1L, TODAY, station, ImportBatchImportMode.IN_DAY);

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.LATE_IMPORT);
        assertThat(result.lateImportWarning()).isTrue();
    }

    @Test
    @DisplayName("IN_DAY returns SUPPLEMENTARY when non-draft line exists")
    void resolve_existingNonDraft_returnsSupplementary() {
        fixedInstant(TODAY.atTime(10, 0));
        when(importBatchLineRepositoryPort.existsNonDraftLineForStationAndDrawDate(1L, TODAY))
                .thenReturn(true);

        var result = resolver.resolve(1L, TODAY, station, ImportBatchImportMode.IN_DAY);

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.SUPPLEMENTARY);
    }

    @Test
    @DisplayName("IN_DAY returns NEW when no non-draft line exists")
    void resolve_default_returnsNew() {
        fixedInstant(TODAY.atTime(10, 0));
        when(importBatchLineRepositoryPort.existsNonDraftLineForStationAndDrawDate(eq(1L), eq(TODAY)))
                .thenReturn(false);

        var result = resolver.resolve(1L, TODAY, station, ImportBatchImportMode.IN_DAY);

        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.NEW);
        assertThat(result.lateImportWarning()).isFalse();
    }

    private void fixedInstant(java.time.LocalDateTime dateTime) {
        Instant instant = dateTime.atZone(ZONE).toInstant();
        when(clock.instant()).thenReturn(instant);
        when(clock.getZone()).thenReturn(ZONE);
    }
}
