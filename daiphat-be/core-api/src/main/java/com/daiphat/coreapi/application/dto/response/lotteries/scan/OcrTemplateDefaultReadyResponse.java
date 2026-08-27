package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import lombok.Builder;

@Builder
public record OcrTemplateDefaultReadyResponse(
        boolean ready,
        long activeDefaultCount
) {}
