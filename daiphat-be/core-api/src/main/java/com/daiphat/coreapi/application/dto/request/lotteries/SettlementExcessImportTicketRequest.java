package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Excess physical ticket confirmed by admin during import discrepancy resolution.
 */
public record SettlementExcessImportTicketRequest(
        @NotNull Long lotteryStationId,
        @NotBlank String numbers,
        @NotBlank String serialNumber
) {
}
