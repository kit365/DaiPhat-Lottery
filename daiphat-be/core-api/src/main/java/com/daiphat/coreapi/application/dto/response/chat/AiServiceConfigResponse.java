package com.daiphat.coreapi.application.dto.response.chat;

import com.daiphat.coreapi.domain.model.chat.AiServiceConfigModel;

import java.time.LocalDateTime;

public record AiServiceConfigResponse(
        String serviceName,
        String description,
        boolean enabled,
        boolean operational,
        LocalDateTime updatedAt,
        String lastModifiedBy
) {

    public static AiServiceConfigResponse from(AiServiceConfigModel config) {
        return new AiServiceConfigResponse(
                config.getServiceName().name(),
                config.getDescription(),
                Boolean.TRUE.equals(config.getEnabled()),
                config.isUsable(),
                config.getUpdatedAt(),
                config.getLastModifiedBy()
        );
    }
}
