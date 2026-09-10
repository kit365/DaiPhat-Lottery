package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;

public record ConfirmPrizeClaimHandoverRequest(
        String handoverReceiptUrl,
        @NotBlank(message = "Ảnh bằng chứng bàn giao (handoverEvidenceUrl) là bắt buộc.")
        String handoverEvidenceUrl,
        String supplierReference,
        String note
) {
}
