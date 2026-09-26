package com.daiphat.coreapi.application.dto.request.payout;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Online payout claim — CCCD front/back for OCR only.
 * Recipient CCCD number is extracted by eKYC OCR (not accepted from the client).
 */
public record CreatePrizePayoutRequestRequest(
        Long orderDetailId,
        Long serialId,
        @NotNull Long bankAccountId,
        @NotBlank @Size(max = 500) String recipientIdImageUrl,
        @NotBlank @Size(max = 500) String recipientIdImageBackUrl
) {
}
