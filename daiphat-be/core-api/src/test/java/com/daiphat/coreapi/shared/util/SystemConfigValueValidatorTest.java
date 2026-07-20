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
    @ValueSource(strings = {"14:30", "9:05", "23:59"})
    void parse_time_acceptsValidValues(String value) {
        Object result = SystemConfigValueValidator.parse(value, DataType.TIME);

        assertThat(result).isInstanceOf(String.class);
    }

    @Test
    void parse_time_normalizesToHourMinuteFormat() {
        Object result = SystemConfigValueValidator.parse("9:05", DataType.TIME);

        assertThat(result).isEqualTo("09:05");
    }

    @ParameterizedTest
    @ValueSource(strings = {"25:00", "14:60", "abc", "14-30"})
    void parse_time_rejectsInvalidValues(String value) {
        assertThatThrownBy(() -> SystemConfigValueValidator.parse(value, DataType.TIME))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
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
                        "23:59", DataType.TIME, "{\"min\":\"00:00\",\"max\":\"18:00\"}"))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @Test
    void validate_withBlankRules_skipsRangeCheck() {
        SystemConfigValueValidator.validate("99999", DataType.INT, "  ");
    }
}
