package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.DataType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("SystemConfigValueValidator Unit Tests")
class SystemConfigValueValidatorTest {

    @Test
    void parse_int_returnsInteger() {
        Object result = SystemConfigValueValidator.parse("42", DataType.INT);

        assertThat(result).isEqualTo(42);
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "12.5", ""})
    void parse_int_rejectsInvalidValues(String value) {
        assertThatThrownBy(() -> SystemConfigValueValidator.parse(value, DataType.INT))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @ParameterizedTest
    @ValueSource(strings = {"true", "TRUE", " True "})
    void parse_boolean_acceptsTrue(String value) {
        assertThat(SystemConfigValueValidator.parse(value, DataType.BOOLEAN)).isEqualTo(true);
    }

    @ParameterizedTest
    @ValueSource(strings = {"false", "FALSE", " False "})
    void parse_boolean_acceptsFalse(String value) {
        assertThat(SystemConfigValueValidator.parse(value, DataType.BOOLEAN)).isEqualTo(false);
    }

    @ParameterizedTest
    @ValueSource(strings = {"yes", "1", "0", "abc", ""})
    void parse_boolean_rejectsInvalidValues(String value) {
        assertThatThrownBy(() -> SystemConfigValueValidator.parse(value, DataType.BOOLEAN))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @ParameterizedTest
    @ValueSource(strings = {"14:30", "9:05", "23:59", "17:00", "17:00:00"})
    void parse_time_acceptsValidValues(String value) {
        Object result = SystemConfigValueValidator.parse(value, DataType.TIME);

        assertThat(result).isInstanceOf(String.class);
    }

    @Test
    void parse_time_normalizesToHourMinuteFormat() {
        Object result = SystemConfigValueValidator.parse("9:05", DataType.TIME);

        assertThat(result).isEqualTo("09:05");
    }

    @Test
    void parse_time_normalizesSecondsToHourMinute() {
        Object result = SystemConfigValueValidator.parse("17:00:00", DataType.TIME);

        assertThat(result).isEqualTo("17:00");
    }

    @ParameterizedTest
    @ValueSource(strings = {"25:00", "14:60", "abc", "14-30"})
    void parse_time_rejectsInvalidValues(String value) {
        assertThatThrownBy(() -> SystemConfigValueValidator.parse(value, DataType.TIME, "Giờ chốt trả vé đại lý"))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException domain = (DomainException) ex;
                    assertThat(domain.getErrorCode()).isEqualTo(ErrorCode.SYSTEM_CONFIG_TIME_INVALID);
                    assertThat(domain.getMessage())
                            .isEqualTo("Giờ chốt trả vé đại lý phải có định dạng HH:mm (ví dụ 17:00).");
                });
    }

    @Test
    void validate_delegatesToParse() {
        SystemConfigValueValidator.validate("30", DataType.INT);
    }

    @Test
    void validate_withRules_acceptsInRangeInt() {
        SystemConfigValueValidator.validate("30", DataType.INT, "{\"min\":1,\"max\":1440}");
    }

    @Test
    void validate_withRules_rejectsOutOfRangeInt() {
        assertThatThrownBy(() ->
                SystemConfigValueValidator.validate("0", DataType.INT, "{\"min\":1,\"max\":1440}"))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @Test
    void validate_withRules_acceptsInRangeTime() {
        SystemConfigValueValidator.validate("14:30", DataType.TIME, "{\"min\":\"00:00\",\"max\":\"23:59\"}");
    }

    @Test
    void validate_withRules_rejectsOutOfRangeTime() {
        assertThatThrownBy(() ->
                SystemConfigValueValidator.validate(
                        "23:59",
                        DataType.TIME,
                        "{\"min\":\"00:00\",\"max\":\"18:00\"}",
                        "Giờ chốt trả vé đại lý"))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException domain = (DomainException) ex;
                    assertThat(domain.getErrorCode()).isEqualTo(ErrorCode.SYSTEM_CONFIG_TIME_OUT_OF_RANGE);
                    assertThat(domain.getMessage())
                            .isEqualTo("Giờ chốt trả vé đại lý phải trong khoảng 00:00–18:00.");
                });
    }

    @Test
    void validate_withBlankRules_skipsRangeCheck() {
        SystemConfigValueValidator.validate("99999", DataType.INT, "  ");
    }

    @Test
    void validate_string_allowsEmptyWhenRuleSaysSo() {
        SystemConfigValueValidator.validate("", DataType.STRING, "{\"allowEmpty\":true,\"maxLength\":255}");
    }

    @Test
    void validate_string_rejectsEmptyWhenNotAllowed() {
        assertThatThrownBy(() ->
                SystemConfigValueValidator.validate("", DataType.STRING, "{\"allowEmpty\":false}"))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @Test
    void validate_string_rejectsOverMaxLength() {
        assertThatThrownBy(() ->
                SystemConfigValueValidator.validate("abcdef", DataType.STRING, "{\"allowEmpty\":true,\"maxLength\":3}"))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @Test
    void validate_string_acceptsAllowedValues() {
        SystemConfigValueValidator.validate(
                "FORFEIT_DEPOSIT",
                DataType.STRING,
                "{\"allowedValues\":[\"FORFEIT_DEPOSIT\",\"FORCE_PURCHASE_ALL\"]}");
    }

    @Test
    void validate_string_rejectsDisallowedValues() {
        assertThatThrownBy(() ->
                SystemConfigValueValidator.validate(
                        "UNKNOWN",
                        DataType.STRING,
                        "{\"allowedValues\":[\"FORFEIT_DEPOSIT\",\"FORCE_PURCHASE_ALL\"]}"))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @Test
    void validate_decimal_acceptsInRange() {
        SystemConfigValueValidator.validate("0.10", DataType.DECIMAL, "{\"min\":0,\"max\":1}");
    }

    @Test
    void validate_decimal_rejectsOutOfRange() {
        assertThatThrownBy(() ->
                SystemConfigValueValidator.validate("1.5", DataType.DECIMAL, "{\"min\":0,\"max\":1}"))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @Test
    void validate_draft_ttl_acceptsConfiguredRange() {
        SystemConfigValueValidator.validate("15", DataType.INT, "{\"min\":1,\"max\":120}");
    }

    @Test
    void validate_draft_ttl_rejectsOutOfRange() {
        assertThatThrownBy(() ->
                SystemConfigValueValidator.validate("0", DataType.INT, "{\"min\":1,\"max\":120}"))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }
}
