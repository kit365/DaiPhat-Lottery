package com.daiphat.coreapi.shared.util;

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

    private static final LocalDate TODAY = LocalDate.of(2026, 7, 5);

    @Mock
    private ImportBatchConfigResolver importBatchConfigResolver;

    @InjectMocks
    private ImportBatchStationEligibilityResolver resolver;

    private LotteryStationModel station;

    @BeforeEach
    void setUp() {
        station = LotteryStationModel.builder()
                .id(1L)
                .name("Test Station")
                .drawDays(List.of(DayOfWeek.FRIDAY))
                .drawTime(LocalTime.of(16, 15))
                .build();
        when(importBatchConfigResolver.resolveImportBatchCutoff()).thenReturn(LocalTime.of(15, 0));
    }

    @Test
    @DisplayName("past draw date is always treated as completed")
    void hasCompletedDrawToday_pastDate_returnsTrueEvenWithoutDrawTime() {
        station.setDrawTime(null);

        assertThat(resolver.hasCompletedDrawToday(
                station,
                TODAY.minusDays(2),
                LocalDateTime.of(TODAY, LocalTime.of(10, 0))
        )).isTrue();
    }

    @Test
    @DisplayName("today after station draw time is completed")
    void hasCompletedDrawToday_todayAfterDrawTime_returnsTrue() {
        assertThat(resolver.hasCompletedDrawToday(
                station,
                TODAY,
                LocalDateTime.of(TODAY, LocalTime.of(17, 0))
        )).isTrue();
    }

    @Test
    @DisplayName("today before station draw time is not completed")
    void hasCompletedDrawToday_todayBeforeDrawTime_returnsFalse() {
        assertThat(resolver.hasCompletedDrawToday(
                station,
                TODAY,
                LocalDateTime.of(TODAY, LocalTime.of(10, 0))
        )).isFalse();
    }

    @Test
    @DisplayName("past draw date stations remain selectable for IN_DAY")
    void isEligibleForSelection_pastDrawDate_returnsTrue() {
        assertThat(resolver.isEligibleForSelection(
                station,
                TODAY.minusDays(2),
                LocalDateTime.of(TODAY, LocalTime.of(10, 0)),
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode.IN_DAY
        )).isTrue();
    }
}
