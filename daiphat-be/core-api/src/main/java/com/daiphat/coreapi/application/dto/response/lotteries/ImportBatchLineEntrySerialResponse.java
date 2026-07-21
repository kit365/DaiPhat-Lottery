package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

@Builder
public record ImportBatchLineEntrySerialResponse(
        Long id,
        String serialNumber,
        String ticketImg,
        String status
) {
}
