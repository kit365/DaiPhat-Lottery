package com.daiphat.coreapi.shared.util.tabular;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class TabularValueParserTest {

    @ParameterizedTest
    @CsvSource({
            "'120', 120",
            "'1.000', 1000",
            "'1.234.567', 1234567",
            "' 250 ', 250"
    })
    @DisplayName("VN style reads dots as thousands separators")
    void parseQuantity_vnStyle(String raw, int expected) {
        assertThat(TabularValueParser.parseQuantity(raw, TabularNumberStyle.VN))
                .contains(expected);
    }

    @ParameterizedTest
    @CsvSource({
            "'1,000', 1000",
            "'1,234,567', 1234567"
    })
    @DisplayName("EN style reads commas as thousands separators")
    void parseQuantity_enStyle(String raw, int expected) {
        assertThat(TabularValueParser.parseQuantity(raw, TabularNumberStyle.EN))
                .contains(expected);
    }

    @Test
    @DisplayName("AUTO picks VN when the decimal comma comes last")
    void parseDecimal_autoDetectsVn() {
        assertThat(TabularValueParser.parseDecimal("1.000.000,50", TabularNumberStyle.AUTO))
                .contains(new BigDecimal("1000000.50"));
    }

    @Test
    @DisplayName("AUTO picks EN when the decimal dot comes last")
    void parseDecimal_autoDetectsEn() {
        assertThat(TabularValueParser.parseDecimal("1,000,000.50", TabularNumberStyle.AUTO))
                .contains(new BigDecimal("1000000.50"));
    }

    @Test
    @DisplayName("AUTO treats a lone comma with three trailing digits as a thousands separator")
    void parseDecimal_autoLoneComma() {
        assertThat(TabularValueParser.parseDecimal("1,000", TabularNumberStyle.AUTO))
                .contains(new BigDecimal("1000"));
    }

    @Test
    @DisplayName("Currency noise around the number is ignored")
    void parseDecimal_stripsCurrency() {
        assertThat(TabularValueParser.parseDecimal("10.000 đ", TabularNumberStyle.VN))
                .contains(new BigDecimal("10000"));
    }

    @Test
    @DisplayName("Accounting parentheses mean a negative amount")
    void parseDecimal_parenthesesAreNegative() {
        assertThat(TabularValueParser.parseDecimal("(1.000)", TabularNumberStyle.VN))
                .contains(new BigDecimal("-1000"));
    }

    @Test
    @DisplayName("A fractional value is not a valid quantity")
    void parseQuantity_rejectsFraction() {
        assertThat(TabularValueParser.parseQuantity("120,5", TabularNumberStyle.VN)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "abc", "-"})
    @DisplayName("Junk cells yield no value instead of throwing")
    void parseQuantity_rejectsJunk(String raw) {
        assertThat(TabularValueParser.parseQuantity(raw, TabularNumberStyle.AUTO)).isEmpty();
    }

    @Test
    @DisplayName("Null cells yield no value")
    void parseQuantity_rejectsNull() {
        assertThat(TabularValueParser.parseQuantity(null, TabularNumberStyle.AUTO)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"12/08/2026", "12-8-2026", "2026-08-12", "2026/08/12", "12.08.2026"})
    @DisplayName("The common Vietnamese date layouts are all accepted")
    void parseDate_acceptsCommonFormats(String raw) {
        assertThat(TabularValueParser.parseDate(raw, null))
                .contains(LocalDate.of(2026, 8, 12));
    }

    @Test
    @DisplayName("A trailing time part is ignored")
    void parseDate_ignoresTimePart() {
        assertThat(TabularValueParser.parseDate("12/08/2026 00:00:00", null))
                .contains(LocalDate.of(2026, 8, 12));
    }

    @Test
    @DisplayName("An Excel serial number is recognised as a date")
    void parseDate_readsExcelSerial() {
        // 46246 days after 1899-12-30 is 2026-08-12.
        assertThat(TabularValueParser.parseDate("46246", null))
                .contains(LocalDate.of(2026, 8, 12));
    }

    @Test
    @DisplayName("An explicit format wins over auto-detection")
    void parseDate_honoursExplicitFormat() {
        // Auto-detection would read this as 8 December; the explicit US format makes it 12 August.
        assertThat(TabularValueParser.parseDate("08/12/2026", "MM/dd/uuuu"))
                .contains(LocalDate.of(2026, 8, 12));
        assertThat(TabularValueParser.parseDate("08/12/2026", null))
                .contains(LocalDate.of(2026, 12, 8));
    }

    @Test
    @DisplayName("An unparseable date yields no value")
    void parseDate_rejectsJunk() {
        assertThat(TabularValueParser.parseDate("thang 8", null)).isEmpty();
    }
}
