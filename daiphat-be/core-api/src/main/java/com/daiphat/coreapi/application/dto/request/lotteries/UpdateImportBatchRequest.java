package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record UpdateImportBatchRequest(
        @NotNull Long supplierId,
        LocalDate drawDate,
        String invoiceEvidenceUrl,
        @Valid List<UpdateImportBatchLineRequest> lines
) {
}
