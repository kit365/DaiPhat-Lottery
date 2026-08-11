package com.daiphat.coreapi.application.dto.request.lotteries;

public record ConfirmReturnBatchRequest(
        String returnReceiptUrl,
        String returnReceiptEvidenceUrl
) {
}
