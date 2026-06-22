package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.DataType;
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
            case INT -> parseInt(configValue);
            case TIME -> parseTime(configValue);
        };
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
            return parsed.format(DateTimeFormatter.ofPattern("HH:mm"));
        } catch (DateTimeParseException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }
}
