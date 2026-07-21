package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.util.List;

@Builder
public record ImportBatchLineEntryTicketResponse(
        Long id,
        String numbers,
        String status,
        List<ImportBatchLineEntrySerialResponse> serials
) {
}
