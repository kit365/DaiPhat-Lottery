package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;

@Builder
public record ImportBatchFileManualBatchBinding(
        @NotNull LocalDate drawDate,
        @NotNull Long importBatchId
) {
}
