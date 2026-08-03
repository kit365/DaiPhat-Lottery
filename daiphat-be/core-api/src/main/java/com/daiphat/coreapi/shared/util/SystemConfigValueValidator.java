package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.DataType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SystemConfigValueValidator {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("H:mm")
            .withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter TIME_NORMALIZE_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static void validate(String configValue, DataType dataType) {
        parse(configValue, dataType);
    }

    public static void validate(String configValue, DataType dataType, String validationRules) {
        Object parsed = parse(configValue, dataType);
        applyRules(parsed, dataType, validationRules);
    }

    public static Object parse(String configValue, DataType dataType) {
        if (dataType == null) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        if (configValue == null) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }

        return switch (dataType) {
            case INT -> parseInt(configValue);
            case TIME -> parseTime(configValue);
            case BOOLEAN -> parseBoolean(configValue);
            case DECIMAL -> parseDecimal(configValue);
            case JSON -> parseJson(configValue);
        };
    }

    private static void applyRules(Object parsed, DataType dataType, String validationRules) {
        if (validationRules == null || validationRules.isBlank()) {
            return;
        }

        JsonNode rules;
        try {
            rules = OBJECT_MAPPER.readTree(validationRules);
        } catch (Exception ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }

        if (rules == null || rules.isNull() || rules.isEmpty()) {
            return;
        }

        switch (dataType) {
            case INT -> applyIntRules((Integer) parsed, rules);
            case TIME -> applyTimeRules((String) parsed, rules);
            case DECIMAL -> applyDecimalRules((java.math.BigDecimal) parsed, rules);
            case BOOLEAN, JSON -> {
                // No range rules.
            }
        }
    }

    private static void applyIntRules(Integer value, JsonNode rules) {
        if (rules.hasNonNull("min") && value < rules.get("min").asInt()) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        if (rules.hasNonNull("max") && value > rules.get("max").asInt()) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private static void applyTimeRules(String normalizedHhMm, JsonNode rules) {
        LocalTime value = LocalTime.parse(normalizedHhMm, TIME_NORMALIZE_FORMATTER);
        if (rules.hasNonNull("min")) {
            LocalTime min = parseBoundTime(rules.get("min").asText());
            if (value.isBefore(min)) {
                throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
            }
        }
        if (rules.hasNonNull("max")) {
            LocalTime max = parseBoundTime(rules.get("max").asText());
            if (value.isAfter(max)) {
                throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
            }
        }
    }

    private static LocalTime parseBoundTime(String raw) {
        try {
            return LocalTime.parse(raw.trim(), TIME_FORMATTER);
        } catch (DateTimeParseException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private static Integer parseInt(String configValue) {
        try {
            return Integer.parseInt(configValue.trim());
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private static String parseTime(String configValue) {
        try {
            LocalTime parsed = LocalTime.parse(configValue.trim(), TIME_FORMATTER);
            return parsed.format(TIME_NORMALIZE_FORMATTER);
        } catch (DateTimeParseException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private static Boolean parseBoolean(String configValue) {
        String normalized = configValue.trim().toLowerCase();
        if ("true".equals(normalized)) {
            return Boolean.TRUE;
        }
        if ("false".equals(normalized)) {
            return Boolean.FALSE;
        }
        throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    private static java.math.BigDecimal parseDecimal(String configValue) {
        try {
            return new java.math.BigDecimal(configValue.trim());
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private static String parseJson(String configValue) {
        try {
            OBJECT_MAPPER.readTree(configValue.trim());
            return configValue.trim();
        } catch (Exception ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private static void applyDecimalRules(java.math.BigDecimal value, JsonNode rules) {
        if (rules.hasNonNull("min") && value.compareTo(rules.get("min").decimalValue()) < 0) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        if (rules.hasNonNull("max") && value.compareTo(rules.get("max").decimalValue()) > 0) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }
}
