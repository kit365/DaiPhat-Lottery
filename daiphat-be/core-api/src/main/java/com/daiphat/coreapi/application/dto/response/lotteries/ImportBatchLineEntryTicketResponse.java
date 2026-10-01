package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

@Builder
public record ImportBatchLineEntryTicketResponse(
        Long id,
        String numbers,
        BigDecimal priceSnapshot,
        String status,
        List<ImportBatchLineEntrySerialResponse> serials
) {
}
