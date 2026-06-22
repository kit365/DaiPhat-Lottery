package com.daiphat.coreapi.application.dto.response.settings;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record SystemConfigResponse(
        Long id,
        String configKey,
        String configValue,
        String configType,
        String dataType,
        String description,
        LocalDateTime updatedAt,
        String updatedBy
) {
}
