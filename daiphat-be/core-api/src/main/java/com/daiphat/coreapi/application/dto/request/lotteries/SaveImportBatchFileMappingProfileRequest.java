package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Remember a column mapping for this supplier's file layout so the next upload
 * needs no manual mapping.
 */
public record SaveImportBatchFileMappingProfileRequest(
        @NotNull(message = "Nhà cung cấp không được để trống")
        Long supplierId,

        @NotBlank(message = "Thiếu chữ ký dòng tiêu đề")
        String headerSignature,

        @NotNull(message = "Cấu hình cột không được để trống")
        @Valid
        ImportBatchFileMappingRequest mapping
) {
}
