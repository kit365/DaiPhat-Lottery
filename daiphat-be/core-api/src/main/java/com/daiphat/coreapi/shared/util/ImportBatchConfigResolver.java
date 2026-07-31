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
        String defaultValue = SystemConfigEnum.RETURN_BUFFER_TIME.getDefaultValue();
        String value = systemConfigRepositoryPort.findByConfigKey(SystemConfigEnum.RETURN_BUFFER_TIME.name())
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
