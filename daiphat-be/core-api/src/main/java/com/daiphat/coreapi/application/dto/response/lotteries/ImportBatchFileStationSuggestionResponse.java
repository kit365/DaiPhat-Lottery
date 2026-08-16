package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

/**
 * A station the operator can pick when the file text did not resolve to exactly
 * one station.
 */
@Builder
public record ImportBatchFileStationSuggestionResponse(
        Long lotteryStationId,
        String name,
        double score
) {
}
