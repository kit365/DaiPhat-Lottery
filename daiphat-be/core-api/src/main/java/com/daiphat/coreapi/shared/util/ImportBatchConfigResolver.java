package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ImportBatchConfigResolver {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public int resolveReturnBufferMinutes() {
        return resolveNonNegativeInt(SystemConfigEnum.RETURN_BUFFER_TIME);
    }

    public int resolveReturnReminderMinutes() {
        int resolved = resolveNonNegativeInt(SystemConfigEnum.RETURN_REMINDER_TIME);
        return Math.max(1, resolved);
    }

    private int resolveNonNegativeInt(SystemConfigEnum configEnum) {
        String defaultValue = configEnum.getDefaultValue();
        String value = systemConfigRepositoryPort.findByConfigKey(configEnum.name())
                .map(config -> config.getConfigValue())
                .orElse(defaultValue);
        try {
            int parsed = Integer.parseInt(value.trim());
            return Math.max(0, parsed);
        } catch (NumberFormatException ex) {
            return Integer.parseInt(defaultValue);
        }
    }
}
