package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ImportBatchTypeResolver Unit Tests")
class ImportBatchTypeResolverTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;

    private ImportBatchTypeResolver resolver;

    private final LotteryStationModel station = LotteryStationModel.builder().id(1L).name("HCM").build();

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-07-28T07:00:00Z"), ZONE); // 14:00 VN
        resolver = new ImportBatchTypeResolver(importBatchLineRepositoryPort, clock);
    }

    @Test
    @DisplayName("null draw date returns ADJUSTMENT")
    void resolve_nullDrawDate_adjustment() {
        var result = resolver.resolve(1L, null, station, ImportBatchImportMode.IN_DAY);
        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.ADJUSTMENT);
    }

    @Test
    @DisplayName("past draw date returns ADJUSTMENT")
    void resolve_pastDrawDate_adjustment() {
        var result = resolver.resolve(1L, LocalDate.of(2026, 7, 27), station, ImportBatchImportMode.IN_DAY);
        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.ADJUSTMENT);
    }

    @Test
    @DisplayName("POST_DRAW_SUPPLEMENT returns ADJUSTMENT")
    void resolve_postDrawMode_adjustment() {
        var result = resolver.resolve(1L, LocalDate.of(2026, 7, 28), station, ImportBatchImportMode.POST_DRAW_SUPPLEMENT);
        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.ADJUSTMENT);
    }

    @Test
    @DisplayName("IN_DAY today without existing line returns NEW")
    void resolve_inDayToday_new() {
        when(importBatchLineRepositoryPort.existsNonDraftLineForStationAndDrawDate(1L, LocalDate.of(2026, 7, 28)))
                .thenReturn(false);
        var result = resolver.resolve(1L, LocalDate.of(2026, 7, 28), station, ImportBatchImportMode.IN_DAY);
        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.NEW);
        assertThat(result.lateImportWarning()).isFalse();
    }

    @Test
    @DisplayName("IN_DAY with existing line returns SUPPLEMENTARY")
    void resolve_inDayExisting_supplementary() {
        when(importBatchLineRepositoryPort.existsNonDraftLineForStationAndDrawDate(1L, LocalDate.of(2026, 7, 28)))
                .thenReturn(true);
        var result = resolver.resolve(1L, LocalDate.of(2026, 7, 28), station, ImportBatchImportMode.IN_DAY);
        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.SUPPLEMENTARY);
    }

    @Test
    @DisplayName("far future draw date returns ADJUSTMENT")
    void resolve_farFuture_adjustment() {
        var result = resolver.resolve(1L, LocalDate.of(2026, 8, 5), station, ImportBatchImportMode.IN_DAY);
        assertThat(result.resolvedBatchType()).isEqualTo(ImportBatchType.ADJUSTMENT);
    }
}
