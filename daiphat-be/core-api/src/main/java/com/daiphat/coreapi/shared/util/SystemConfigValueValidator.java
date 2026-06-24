package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.DataType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.Locale;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SystemConfigValueValidator {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static void validate(String configValue, DataType dataType) {
        parse(configValue, dataType);
    }

    public static Object parse(String configValue, DataType dataType) {
        if (dataType == null) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        if (configValue == null) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }

        return switch (dataType) {
            case STRING -> parseString(configValue);
            case INTEGER -> parseInteger(configValue);
            case BOOLEAN -> parseBoolean(configValue);
            case JSON -> parseJson(configValue);
        };
    }

    private static String parseString(String configValue) {
        String trimmed = configValue.trim();
        if (trimmed.isEmpty()) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        return trimmed;
    }

    private static Integer parseInteger(String configValue) {
        try {
            return Integer.parseInt(configValue.trim());
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private static Boolean parseBoolean(String configValue) {
        String normalized = configValue.trim().toLowerCase(Locale.ROOT);
        if ("true".equals(normalized)) {
            return Boolean.TRUE;
        }
        if ("false".equals(normalized)) {
            return Boolean.FALSE;
        }
        throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
    }

    private static JsonNode parseJson(String configValue) {
        try {
            return OBJECT_MAPPER.readTree(configValue);
        } catch (Exception ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }
}
