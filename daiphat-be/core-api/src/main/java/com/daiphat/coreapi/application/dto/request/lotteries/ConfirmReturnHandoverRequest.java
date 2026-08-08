package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;

public record ConfirmReturnHandoverRequest(
        String returnReceiptUrl,
        @NotBlank(message = "Ảnh bằng chứng trả vé (returnEvidenceUrl) là bắt buộc.")
        String returnEvidenceUrl,
        String note
) {
}
