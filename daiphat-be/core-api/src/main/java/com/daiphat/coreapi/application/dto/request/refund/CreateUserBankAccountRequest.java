package com.daiphat.coreapi.application.dto.request.refund;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateUserBankAccountRequest(
        @NotBlank @Size(max = 20) String bankBin,
        @NotBlank @Size(max = 50) String bankAccountNo,
        @NotBlank @Size(max = 150) String bankAccountName,
        Boolean isDefault,
        @NotNull @AssertTrue Boolean agreedToRefundTerms
) {
}
