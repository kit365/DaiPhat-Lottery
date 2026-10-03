package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;

@Builder
public record OcrConfirmImportTicketRequest(
        // Production lot (Ký hiệu/Lô) is intentionally absent: neither the
        // ticket nor ticket-serial persistence model stores it.
        @NotBlank String numbers,
        @NotBlank String serialNumber,
        @NotNull Long stationId,
        @NotNull LocalDate drawDate,
        String ticketImageBase64,
        Long ocrScanResultId
) {
}
