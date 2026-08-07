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

    /** Accepts H:mm or HH:mm (e.g. 9:05, 17:00). */
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("H:mm")
            .withResolverStyle(ResolverStyle.STRICT);
    /** Canonical stored/display format. */
    private static final DateTimeFormatter TIME_NORMALIZE_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final String DEFAULT_TIME_LABEL = "Giá trị thời gian";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static void validate(String configValue, DataType dataType) {
        parse(configValue, dataType);
    }

    public static void validate(String configValue, DataType dataType, String validationRules) {
        validate(configValue, dataType, validationRules, null);
    }

    public static void validate(String configValue, DataType dataType, String validationRules, String fieldLabel) {
        Object parsed = parse(configValue, dataType, fieldLabel);
        applyRules(parsed, dataType, validationRules, fieldLabel);
    }

    public static Object parse(String configValue, DataType dataType) {
        return parse(configValue, dataType, null);
    }

    public static Object parse(String configValue, DataType dataType, String fieldLabel) {
        if (dataType == null) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        if (configValue == null) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }

        return switch (dataType) {
            case INT -> parseInt(configValue);
            case TIME -> parseTime(configValue, fieldLabel);
            case BOOLEAN -> parseBoolean(configValue);
            case DECIMAL -> parseDecimal(configValue);
            case STRING -> parseString(configValue);
            case JSON -> parseJson(configValue);
        };
    }

    /**
     * Parses a TIME system-config value into {@link LocalTime}.
     * Accepts {@code HH:mm}, {@code H:mm}, and ISO {@code HH:mm:ss}.
     */
    public static LocalTime parseLocalTime(String configValue, String fieldLabel) {
        String normalized = parseTime(configValue, fieldLabel);
        return LocalTime.parse(normalized, TIME_NORMALIZE_FORMATTER);
    }

    private static void applyRules(Object parsed, DataType dataType, String validationRules, String fieldLabel) {
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
            case TIME -> applyTimeRules((String) parsed, rules, fieldLabel);
            case DECIMAL -> applyDecimalRules((java.math.BigDecimal) parsed, rules);
            case STRING -> applyStringRules((String) parsed, rules);
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

    private static void applyTimeRules(String normalizedHhMm, JsonNode rules, String fieldLabel) {
        LocalTime value = LocalTime.parse(normalizedHhMm, TIME_NORMALIZE_FORMATTER);
        String label = timeLabel(fieldLabel);
        if (rules.hasNonNull("min")) {
            LocalTime min = parseBoundTime(rules.get("min").asText(), label);
            if (value.isBefore(min)) {
                throw new DomainException(
                        ErrorCode.SYSTEM_CONFIG_TIME_OUT_OF_RANGE,
                        null,
                        label,
                        formatBound(rules.get("min").asText()),
                        formatBound(rules.hasNonNull("max") ? rules.get("max").asText() : "23:59"));
            }
        }
        if (rules.hasNonNull("max")) {
            LocalTime max = parseBoundTime(rules.get("max").asText(), label);
            if (value.isAfter(max)) {
                throw new DomainException(
                        ErrorCode.SYSTEM_CONFIG_TIME_OUT_OF_RANGE,
                        null,
                        label,
                        formatBound(rules.hasNonNull("min") ? rules.get("min").asText() : "00:00"),
                        formatBound(rules.get("max").asText()));
            }
        }
    }

    private static LocalTime parseBoundTime(String raw, String fieldLabel) {
        try {
            return LocalTime.parse(raw.trim(), TIME_FORMATTER);
        } catch (DateTimeParseException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_TIME_INVALID, null, fieldLabel);
        }
    }

    private static String formatBound(String raw) {
        try {
            return LocalTime.parse(raw.trim(), TIME_FORMATTER).format(TIME_NORMALIZE_FORMATTER);
        } catch (DateTimeParseException ex) {
            return raw.trim();
        }
    }

    private static Integer parseInt(String configValue) {
        try {
            return Integer.parseInt(configValue.trim());
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private static String parseTime(String configValue, String fieldLabel) {
        String raw = configValue.trim();
        String label = timeLabel(fieldLabel);
        try {
            LocalTime parsed = LocalTime.parse(raw, TIME_FORMATTER);
            return parsed.format(TIME_NORMALIZE_FORMATTER);
        } catch (DateTimeParseException primary) {
            try {
                // Tolerate ISO HH:mm:ss (and HH:mm:ss.SSS) from pickers / legacy rows.
                LocalTime parsed = LocalTime.parse(raw);
                return parsed.format(TIME_NORMALIZE_FORMATTER);
            } catch (DateTimeParseException secondary) {
                throw new DomainException(ErrorCode.SYSTEM_CONFIG_TIME_INVALID, null, label);
            }
        }
    }

    private static String timeLabel(String fieldLabel) {
        if (fieldLabel == null || fieldLabel.isBlank()) {
            return DEFAULT_TIME_LABEL;
        }
        return fieldLabel.trim();
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

    private static String parseString(String configValue) {
        return configValue.trim();
    }

    private static void applyStringRules(String value, JsonNode rules) {
        boolean allowEmpty = rules.has("allowEmpty") && rules.get("allowEmpty").asBoolean(false);
        if (value.isEmpty() && !allowEmpty) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }

        if (rules.hasNonNull("maxLength") && value.length() > rules.get("maxLength").asInt()) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }

        if (!rules.has("allowedValues") || !rules.get("allowedValues").isArray()) {
            return;
        }
        for (JsonNode allowed : rules.get("allowedValues")) {
            if (allowed.asText().equals(value)) {
                return;
            }
        }
        throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
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
