package com.daiphat.coreapi.application.dto.response.refund;

public record VietQrBankResponse(
        String code,
        String bin,
        String name,
        String shortName,
        String logo
) {
}
