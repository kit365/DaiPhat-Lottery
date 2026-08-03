package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record CreateReturnBatchRequest(
        @NotNull Long supplierId,
        @NotNull LocalDate drawDate,
        String note,
        @NotEmpty @Valid List<CreateReturnBatchLineRequest> lines
) {
}
