package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

/** A generated .xlsx prize-claim submission slip, ready to stream to the browser. */
@Builder
public record PrizeClaimSubmissionExportResponse(
        String fileName,
        byte[] content
) {
}
