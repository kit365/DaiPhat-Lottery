package com.daiphat.coreapi.domain.model.enums.lottery;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("[DP-37][DP-255] TicketSearchMode — parse chế độ tra cứu vé")
class TicketSearchModeTest {

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "   "})
    @DisplayName("from(blank) → CONTAINS (default)")
    void from_blank_returnsContains(String value) {
        assertThat(TicketSearchMode.from(value)).isEqualTo(TicketSearchMode.CONTAINS);
    }

    @ParameterizedTest
    @CsvSource({
            "SUFFIX, SUFFIX",
            "suffix, SUFFIX",
            " Prefix , PREFIX",
            "EXACT, EXACT",
            "contains, CONTAINS"
    })
    @DisplayName("from(valid) → enum tương ứng (case-insensitive)")
    void from_valid_returnsMode(String input, TicketSearchMode expected) {
        assertThat(TicketSearchMode.from(input)).isEqualTo(expected);
    }

    @Test
    @DisplayName("from(invalid) → CONTAINS")
    void from_invalid_returnsContains() {
        assertThat(TicketSearchMode.from("TAIL")).isEqualTo(TicketSearchMode.CONTAINS);
        assertThat(TicketSearchMode.from("xyz")).isEqualTo(TicketSearchMode.CONTAINS);
    }
}
