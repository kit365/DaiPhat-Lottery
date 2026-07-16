package com.daiphat.coreapi.application.dto.request.refund;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TransferRefundRequestRequest(
        @NotBlank @Size(max = 500) String paymentEvidenceUrl,
        @Size(max = 500) String note
) {
}
