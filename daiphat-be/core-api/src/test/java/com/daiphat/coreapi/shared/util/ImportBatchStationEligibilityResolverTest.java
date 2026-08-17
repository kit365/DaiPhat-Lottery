package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ImportBatchStationEligibilityResolver Unit Tests")
class ImportBatchStationEligibilityResolverTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 7, 6);
    private static final LocalDate TOMORROW = TODAY.plusDays(1);

    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;

    @InjectMocks
    private ImportBatchStationEligibilityResolver resolver;

    private LotteryStationModel station;

    @BeforeEach
    void setUp() {
        station = LotteryStationModel.builder()
                .id(1L)
                .name("Test Station")
                .drawDays(List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.FRIDAY))
                .drawTime(LocalTime.of(16, 15))
                .build();
        when(importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDate(1L, TODAY)).thenReturn(false);
        when(importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDate(1L, TOMORROW)).thenReturn(false);
    }

    /**
     * A past draw date is never selectable here, whichever import mode is asked
     * for.
     *
     * <p>This resolver serves the two screens where a human picks stations for a
     * new batch: manual declaration and file import. Neither may reach back into a
     * draw that has already happened.
     *
     * <p>POST_DRAW_SUPPLEMENT is not the exception it looks like. Supplementary
     * batches are not picked on a screen at all - they are created by
     * SupplierSettlementDiscrepancyInventoryHelper when reconciliation finds the
     * system holding fewer tickets than the supplier's receipt shows, and that
     * path writes through the repository without ever consulting this resolver.
     * So granting the mode eligibility here would widen the two human-facing
     * screens and change nothing about settlement.
     */
    @Test
    @DisplayName("a past draw date is never selectable, whichever import mode is asked for")
    void isEligibleForSelection_pastDrawDate_neverSelectable() {
        LocalDate pastFriday = TODAY.minusDays(3);
        LocalDateTime now = LocalDateTime.of(TODAY, LocalTime.of(10, 0));

        for (ImportBatchImportMode mode : ImportBatchImportMode.values()) {
            assertThat(resolver.isEligibleForSelection(station, pastFriday, now, mode))
                    .as("mode %s must not make a past draw date selectable", mode)
                    .isFalse();
        }
    }

    @Test
    @DisplayName("tomorrow is eligible only for IN_DAY")
    void isEligibleForSelection_tomorrow_inDayOnly() {
        assertThat(resolver.isEligibleForSelection(
                station,
                TOMORROW,
                LocalDateTime.of(TODAY, LocalTime.of(10, 0)),
                ImportBatchImportMode.IN_DAY
        )).isTrue();
        assertThat(resolver.isEligibleForSelection(
                station,
                TOMORROW,
                LocalDateTime.of(TODAY, LocalTime.of(10, 0)),
                ImportBatchImportMode.POST_DRAW_SUPPLEMENT
        )).isFalse();
    }

    @Test
    @DisplayName("today before cutoff is eligible for IN_DAY")
    void isEligibleForSelection_todayBeforeCutoff_inDay() {
        assertThat(resolver.isEligibleForSelection(
                station,
                TODAY,
                LocalDateTime.of(TODAY, LocalTime.of(10, 0)),
                ImportBatchImportMode.IN_DAY
        )).isTrue();
    }

    @Test
    @DisplayName("today remains eligible for IN_DAY regardless of clock time")
    void isEligibleForSelection_todayAnyTime_inDay() {
        assertThat(resolver.isEligibleForSelection(
                station,
                TODAY,
                LocalDateTime.of(TODAY, LocalTime.of(15, 30)),
                ImportBatchImportMode.IN_DAY
        )).isTrue();
        assertThat(resolver.isEligibleForSelection(
                station,
                TODAY,
                LocalDateTime.of(TODAY, LocalTime.of(15, 30)),
                ImportBatchImportMode.POST_DRAW_SUPPLEMENT
        )).isFalse();
    }

    @Test
    @DisplayName("station with draft batch is not eligible")
    void isEligibleForSelection_draftExists_returnsFalse() {
        when(importBatchLineRepositoryPort.existsDraftLineForStationAndDrawDate(1L, TODAY)).thenReturn(true);

        assertThat(resolver.isEligibleForSelection(
                station,
                TODAY,
                LocalDateTime.of(TODAY, LocalTime.of(10, 0)),
                ImportBatchImportMode.IN_DAY
        )).isFalse();
    }

    @Test
    @DisplayName("hasCompletedDrawToday past date returns true")
    void hasCompletedDrawToday_pastDate_returnsTrue() {
        assertThat(resolver.hasCompletedDrawToday(
                station,
                TODAY.minusDays(2),
                LocalDateTime.of(TODAY, LocalTime.of(10, 0))
        )).isTrue();
    }
}
