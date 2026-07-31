package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;

import java.util.List;

public record UpdateReturnBatchRequest(
        String note,
        String returnReceiptUrl,
        @Valid List<CreateReturnBatchLineRequest> addLines
) {
}
