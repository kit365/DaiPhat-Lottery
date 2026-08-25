package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;

@Builder
public record OcrConfirmImportTicketRequest(
        @NotBlank String numbers,
        @NotBlank String serialNumber,
        @NotNull Long stationId,
        @NotNull LocalDate drawDate,
        String ticketImageBase64,
        Long ocrScanResultId
) {
}
