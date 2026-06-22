package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.DataType;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("SystemConfigValueValidator Unit Tests")
class SystemConfigValueValidatorTest {

    @Test
    void parse_string_returnsTrimmedValue() {
        Object result = SystemConfigValueValidator.parse("  hello  ", DataType.STRING);

        assertThat(result).isEqualTo("hello");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "\t"})
    void parse_string_rejectsBlank(String value) {
        assertThatThrownBy(() -> SystemConfigValueValidator.parse(value, DataType.STRING))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @Test
    void parse_integer_returnsInteger() {
        Object result = SystemConfigValueValidator.parse("42", DataType.INTEGER);

        assertThat(result).isEqualTo(42);
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "12.5", ""})
    void parse_integer_rejectsInvalidValues(String value) {
        assertThatThrownBy(() -> SystemConfigValueValidator.parse(value, DataType.INTEGER))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @ParameterizedTest
    @ValueSource(strings = {"true", "TRUE", " false ", "False"})
    void parse_boolean_acceptsTrueFalse(String value) {
        Object result = SystemConfigValueValidator.parse(value, DataType.BOOLEAN);

        assertThat(result).isInstanceOf(Boolean.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"yes", "1", "on"})
    void parse_boolean_rejectsInvalidValues(String value) {
        assertThatThrownBy(() -> SystemConfigValueValidator.parse(value, DataType.BOOLEAN))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @Test
    void parse_json_returnsJsonNode() {
        Object result = SystemConfigValueValidator.parse("{\"phone\":\"1900\"}", DataType.JSON);

        assertThat(result).isInstanceOf(JsonNode.class);
        assertThat(((JsonNode) result).get("phone").asText()).isEqualTo("1900");
    }

    @ParameterizedTest
    @ValueSource(strings = {"{invalid}", "not-json"})
    void parse_json_rejectsInvalidValues(String value) {
        assertThatThrownBy(() -> SystemConfigValueValidator.parse(value, DataType.JSON))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    @Test
    void validate_delegatesToParse() {
        SystemConfigValueValidator.validate("15", DataType.INTEGER);
    }
}
