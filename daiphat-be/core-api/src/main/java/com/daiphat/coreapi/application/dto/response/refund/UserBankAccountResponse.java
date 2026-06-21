package com.daiphat.coreapi.application.dto.response.refund;

import java.time.LocalDateTime;

public record UserBankAccountResponse(
        Long id,
        String bankName,
        String bankLogo,
        String bankBin,
        String bankAccountNo,
        String bankAccountName,
        boolean isDefault,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
