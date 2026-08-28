package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import lombok.Builder;

@Builder
public record AiModelRegistryResponse(
        Long id,
        String provider,
        String modelName,
        String displayName,
        boolean isActive,
        boolean isDefault,
        String notes
) {}
