package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

/**
 * Updates the shared ticket file-import configuration (N suppliers → 1 config).
 */
public record UpdateImportBatchFileConfigRequest(
        @Min(1) @Max(50) Integer maxFileSizeMb,
        @Min(1) @Max(50_000) Integer maxRows,
        @Size(max = 8) String serialSeparator,
        Boolean storeOriginalFile,
        Boolean allowPartialImport,
        /** Mapping-field key → header aliases used for auto-detect. */
        Map<@NotBlank String, @NotNull List<@NotBlank String>> fieldAliases
) {
}
