package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.util.List;

@Builder
public record UpdateImportBatchRequest(
        @NotNull Long supplierId,
        String invoiceEvidenceUrl,
        @NotEmpty @Valid List<UpdateImportBatchLineRequest> lines
) {
}
