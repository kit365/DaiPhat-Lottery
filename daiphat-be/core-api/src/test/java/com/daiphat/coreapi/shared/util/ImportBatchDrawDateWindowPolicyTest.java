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

    /**
     * A supplier hands tomorrow's tickets over during today's opening hours, so a
     * file listing them describes a delivery that really happened. What stops such
     * a batch is the supplier's own intake window, not the calendar — see
     * SupplierTicketIntakeWindowPolicy.
     */
    @Test
    @DisplayName("File import accepts today and tomorrow, never a past draw")
    void fileWindowSpansTodayAndTomorrow() {
        assertThat(policy.containsForFileImport(TODAY, NOW)).isTrue();
        assertThat(policy.containsForFileImport(TODAY.plusDays(1), NOW))
                .as("tomorrow's tickets are collected today")
                .isTrue();
        assertThat(policy.containsForFileImport(TODAY.minusDays(1), NOW))
                .as("yesterday's draw has already happened")
                .isFalse();
        assertThat(policy.containsForFileImport(TODAY.plusDays(2), NOW)).isFalse();
    }

    @Test
    @DisplayName("The file window is reported as today through tomorrow")
    void fileWindowBounds() {
        assertThat(policy.fileImportFrom(NOW)).isEqualTo(TODAY);
        assertThat(policy.fileImportTo(NOW)).isEqualTo(TODAY.plusDays(1));
    }

    @Test
    @DisplayName("Both flows accept exactly the same draw dates")
    void bothFlowsAgree() {
        for (int offset = -3; offset <= 3; offset++) {
            LocalDate candidate = TODAY.plusDays(offset);
            assertThat(policy.containsForFileImport(candidate, NOW))
                    .as("file and manual must agree on %s", candidate)
                    .isEqualTo(policy.contains(candidate, NOW));
        }
    }

    @Test
    @DisplayName("A null draw date is never in either window")
    void nullIsNeverInWindow() {
        assertThat(policy.contains(null, NOW)).isFalse();
        assertThat(policy.containsForFileImport(null, NOW)).isFalse();
    }
}
