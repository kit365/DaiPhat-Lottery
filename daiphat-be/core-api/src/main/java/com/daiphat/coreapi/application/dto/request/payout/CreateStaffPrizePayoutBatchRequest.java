package com.daiphat.coreapi.application.dto.request.payout;

import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateStaffPrizePayoutBatchRequest(
        @NotEmpty @Valid List<BatchItem> items,
        Long bankAccountId,
        @Size(max = 200) String bankName,
        @Size(max = 50) String bankAccountNumber,
        @Size(max = 200) String accountHolderName,
        @Size(max = 200) String recipientFullName,
        @Size(max = 20) String recipientIdNumber,
        @Size(max = 500) String recipientIdImageUrl,
        @Size(max = 500) String recipientIdImageBackUrl,
        @NotNull PrizePayoutPaymentMethod paymentMethod,
        /** Total cash portion across the batch when paymentMethod is COMBINED. */
        java.math.BigDecimal cashAmount,
        Boolean manualOwnershipConfirmed,
        @Size(max = 500) String transferEvidenceUrl,
        @Size(max = 500) String confirmationContractUrl,
        /** Required when any ticket is past customer redemption deadline but still within issuer deadline. */
        Boolean acknowledgeLateRedemption
) {
    public record BatchItem(@NotNull Long orderDetailId) {
    }
}
