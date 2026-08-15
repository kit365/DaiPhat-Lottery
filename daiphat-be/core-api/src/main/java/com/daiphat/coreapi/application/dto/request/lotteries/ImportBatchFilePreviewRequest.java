package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

/**
 * Preview an uploaded supplier file. Stateless: nothing is written, so the client
 * can re-submit freely while the user adjusts the column mapping.
 */
@Builder
public record ImportBatchFilePreviewRequest(
        @NotNull(message = "Nhà cung cấp không được để trống")
        Long supplierId,

        @NotNull(message = "Cấu hình cột không được để trống")
        @Valid
        ImportBatchFileMappingRequest mapping
) {
}
