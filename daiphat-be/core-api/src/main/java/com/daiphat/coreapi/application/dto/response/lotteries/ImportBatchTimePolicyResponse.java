package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

@Builder
public record ImportBatchTimePolicyResponse(
        int returnBufferMinutes
) {
}
