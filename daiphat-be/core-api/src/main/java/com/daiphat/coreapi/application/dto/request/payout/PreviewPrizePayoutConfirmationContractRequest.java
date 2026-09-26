package com.daiphat.coreapi.application.dto.request.payout;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Staff confirmation-contract preview. CCCD number is OCR'd from the uploaded images
 * (not typed manually).
 */
public record PreviewPrizePayoutConfirmationContractRequest(
        @NotEmpty List<Long> orderDetailIds,
        @NotBlank @Size(max = 200) String recipientFullName,
        @NotBlank @Size(max = 500) String recipientIdImageUrl,
        @NotBlank @Size(max = 500) String recipientIdImageBackUrl
) {
}
