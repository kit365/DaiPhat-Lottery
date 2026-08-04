package com.daiphat.coreapi.application.dto.request.payout;

import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateStaffPrizePayoutRequest(
        Long orderDetailId,
        Long serialId,
        @Size(max = 100) String serialNumber,
        @Size(max = 50) String orderCode,
        Long bankAccountId,
        @Size(max = 200) String bankName,
        @Size(max = 50) String bankAccountNumber,
        @Size(max = 200) String accountHolderName,
        @Size(max = 200) String recipientFullName,
        @Size(max = 20) String recipientIdNumber,
        @Size(max = 500) String recipientIdImageUrl,
        @Size(max = 500) String recipientIdImageBackUrl,
        @NotNull PrizePayoutPaymentMethod paymentMethod,
        java.math.BigDecimal cashAmount,
        Boolean manualOwnershipConfirmed,
        @Size(max = 500) String transferEvidenceUrl,
        @Size(max = 500) String confirmationContractUrl
) {
}
