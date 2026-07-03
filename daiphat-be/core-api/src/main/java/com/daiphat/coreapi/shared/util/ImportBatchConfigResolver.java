package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Component
@RequiredArgsConstructor
public class ImportBatchConfigResolver {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("H:mm");

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public LocalTime resolveLateWindowStart() {
        return resolveTime(
                SystemConfigEnum.IMPORT_LATE_WINDOW_START.name(),
                SystemConfigEnum.IMPORT_LATE_WINDOW_START.getDefaultValue()
        );
    }

    public LocalTime resolveImportCutoff() {
        return resolveTime(
                SystemConfigEnum.VENDOR_RETURN_CUTOFF.name(),
                SystemConfigEnum.VENDOR_RETURN_CUTOFF.getDefaultValue()
        );
    }

    private LocalTime resolveTime(String configKey, String defaultValue) {
        String value = systemConfigRepositoryPort.findByConfigKey(configKey)
                .map(config -> config.getConfigValue())
                .orElse(defaultValue);
        return parseTime(value, defaultValue);
    }

    private LocalTime parseTime(String value, String fallback) {
        try {
            return LocalTime.parse(value.trim(), TIME_FORMATTER);
        } catch (DateTimeParseException ex) {
            return LocalTime.parse(fallback.trim(), TIME_FORMATTER);
        }
    }
}
