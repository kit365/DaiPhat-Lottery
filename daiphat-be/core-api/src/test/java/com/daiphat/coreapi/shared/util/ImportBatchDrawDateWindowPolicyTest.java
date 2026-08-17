package com.daiphat.coreapi.shared.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class ImportBatchDrawDateWindowPolicyTest {

    private final ImportBatchDrawDateWindowPolicy policy = new ImportBatchDrawDateWindowPolicy();

    private static final LocalDate TODAY = LocalDate.of(2026, 8, 16);
    private static final LocalDateTime NOW = LocalDateTime.of(TODAY, LocalTime.of(9, 0));

    @Test
    @DisplayName("Manual entry still accepts today and tomorrow")
    void manualWindowSpansTwoDays() {
        assertThat(policy.contains(TODAY, NOW)).isTrue();
        assertThat(policy.contains(TODAY.plusDays(1), NOW)).isTrue();
        assertThat(policy.contains(TODAY.minusDays(1), NOW)).isFalse();
        assertThat(policy.contains(TODAY.plusDays(2), NOW)).isFalse();
    }

    @Test
    @DisplayName("File import accepts today only - not tomorrow, not yesterday")
    void fileWindowIsTodayOnly() {
        assertThat(policy.containsForFileImport(TODAY, NOW)).isTrue();
        assertThat(policy.containsForFileImport(TODAY.plusDays(1), NOW))
                .as("tomorrow's tickets have not been delivered yet")
                .isFalse();
        assertThat(policy.containsForFileImport(TODAY.minusDays(1), NOW))
                .as("yesterday's draw has already happened")
                .isFalse();
    }

    @Test
    @DisplayName("The file window is reported as a single day, so the preview says so")
    void fileWindowBoundsAreTheSameDay() {
        assertThat(policy.fileImportFrom(NOW)).isEqualTo(TODAY);
        assertThat(policy.fileImportTo(NOW)).isEqualTo(TODAY);
    }

    @Test
    @DisplayName("The file window is strictly narrower than the manual one")
    void fileWindowIsNarrowerThanManual() {
        // Anything file import accepts, manual entry accepts too - never the reverse.
        for (int offset = -3; offset <= 3; offset++) {
            LocalDate candidate = TODAY.plusDays(offset);
            if (policy.containsForFileImport(candidate, NOW)) {
                assertThat(policy.contains(candidate, NOW))
                        .as("manual window must contain %s", candidate)
                        .isTrue();
            }
        }
    }

    @Test
    @DisplayName("A null draw date is never in either window")
    void nullIsNeverInWindow() {
        assertThat(policy.contains(null, NOW)).isFalse();
        assertThat(policy.containsForFileImport(null, NOW)).isFalse();
    }
}
