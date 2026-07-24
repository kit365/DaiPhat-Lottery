package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("[DP-37][DP-255] TicketNumberSearchUtils + DrawScheduleUtils — tra cứu vé")
class TicketNumberSearchUtilsTest {

    @Nested
    @DisplayName("toPattern")
    class ToPattern {
        @Test
        void blank_returnsNull() {
            assertThat(TicketNumberSearchUtils.toPattern(null, TicketSearchMode.SUFFIX)).isNull();
            assertThat(TicketNumberSearchUtils.toPattern("  ", TicketSearchMode.SUFFIX)).isNull();
        }

        @ParameterizedTest
        @CsvSource({
                "68, SUFFIX, %68",
                "68, PREFIX, 68%",
                "686868, EXACT, 686868",
                "68, CONTAINS, %68%"
        })
        void buildsExpectedPattern(String search, TicketSearchMode mode, String expected) {
            assertThat(TicketNumberSearchUtils.toPattern(search, mode)).isEqualTo(expected);
        }

        @Test
        void nullMode_defaultsToContainsPattern() {
            assertThat(TicketNumberSearchUtils.toPattern("68", null)).isEqualTo("%68%");
        }
    }

    @Nested
    @DisplayName("matches — đuôi / đầu / exact / chứa")
    class Matches {
        @Test
        void suffix_onlyEndsWith() {
            assertThat(TicketNumberSearchUtils.matches("126868", "68", TicketSearchMode.SUFFIX)).isTrue();
            assertThat(TicketNumberSearchUtils.matches("681234", "68", TicketSearchMode.SUFFIX)).isFalse();
            assertThat(TicketNumberSearchUtils.matches("126800", "68", TicketSearchMode.SUFFIX)).isFalse();
        }

        @Test
        void prefix_onlyStartsWith() {
            assertThat(TicketNumberSearchUtils.matches("681234", "68", TicketSearchMode.PREFIX)).isTrue();
            assertThat(TicketNumberSearchUtils.matches("126868", "68", TicketSearchMode.PREFIX)).isFalse();
        }

        @Test
        void exact_fullMatchOnly() {
            assertThat(TicketNumberSearchUtils.matches("686868", "686868", TicketSearchMode.EXACT)).isTrue();
            assertThat(TicketNumberSearchUtils.matches("686868", "68", TicketSearchMode.EXACT)).isFalse();
        }

        @Test
        void contains_anywhere() {
            assertThat(TicketNumberSearchUtils.matches("127900", "68", TicketSearchMode.CONTAINS)).isFalse();
            assertThat(TicketNumberSearchUtils.matches("126868", "68", TicketSearchMode.CONTAINS)).isTrue();
            assertThat(TicketNumberSearchUtils.matches("681234", "68", TicketSearchMode.CONTAINS)).isTrue();
            assertThat(TicketNumberSearchUtils.matches("127900", "268", TicketSearchMode.CONTAINS)).isFalse();
            assertThat(TicketNumberSearchUtils.matches("126800", "126", TicketSearchMode.CONTAINS)).isTrue();
        }

        @Test
        void nullMode_defaultsToContains() {
            assertThat(TicketNumberSearchUtils.matches("126868", "68", null)).isTrue();
            assertThat(TicketNumberSearchUtils.matches("681234", "68", null)).isTrue();
        }
    }

    @Nested
    @DisplayName("resolveDefaultSellableDrawDate — sau giờ xổ chuyển ngày mai")
    class SellableDrawDate {
        private final LocalDate day = LocalDate.of(2026, 7, 24);
        private final LocalTime cutoff = LocalTime.of(16, 15);

        @Test
        void beforeCutoff_returnsToday() {
            assertThat(DrawScheduleUtils.resolveDefaultSellableDrawDate(
                    day, LocalTime.of(15, 0), cutoff
            )).isEqualTo(day);
        }

        @Test
        void atCutoff_returnsTomorrow() {
            assertThat(DrawScheduleUtils.resolveDefaultSellableDrawDate(
                    day, LocalTime.of(16, 15), cutoff
            )).isEqualTo(day.plusDays(1));
        }

        @Test
        void afterCutoff_returnsTomorrow() {
            assertThat(DrawScheduleUtils.resolveDefaultSellableDrawDate(
                    day, LocalTime.of(19, 50), cutoff
            )).isEqualTo(day.plusDays(1));
        }
    }
}
