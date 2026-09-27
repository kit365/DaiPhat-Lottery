package com.daiphat.coreapi.application.dto.request.lotteries.scan;

public record CreateOcrSessionRequest(
        Long importBatchId,
        Long importBatchLineId
) {
}
