package com.daiphat.coreapi.application.service.lotteries;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TicketScanOcrAccuracyTest {
    @Test
    void includesUnreadableTemplateFieldsInDenominator() {
        List<String> expected = List.of("stationName", "numbers", "drawDate", "batchCode", "serialSymbol");
        assertThat(Math.round(TicketScanImportService.calculateOcrAccuracy(expected, Map.of(
                "stationName", 0.95, "numbers", 0.90, "drawDate", 0.85, "serialSymbol", 0.80
        )) * 100)).isEqualTo(70L);
        assertThat(Math.round(TicketScanImportService.calculateOcrAccuracy(expected, Map.of(
                "stationName", 0.95, "numbers", 0.90, "drawDate", 0.85,
                "batchCode", 0.75, "serialSymbol", 0.80
        )) * 100)).isEqualTo(85L);
        assertThat(Math.round(TicketScanImportService.calculateOcrAccuracy(
                List.of("stationName", "numbers"), Map.of("stationName", 88.0, "numbers", 0.92)
        ) * 100)).isEqualTo(90L);
    }
}
