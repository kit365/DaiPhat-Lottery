package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

/**
 * The rules currently in force for reading a supplier file, so the import dialog
 * can show the operator exactly what the system will do before they upload.
 *
 * @param configKey       system_config key holding the editable part
 * @param fixedRules      rules that come from the data model rather than settings,
 *                        listed so the panel explains the whole behaviour and not
 *                        just the half that happens to be configurable
 */
@Builder
public record ImportBatchFileConfigResponse(
        String configKey,
        /** Always ROW: one record per horizontal row. Transposed files are not read. */
        String readingDirection,
        String readingDirectionNote,
        List<ImportBatchFileFieldRuleResponse> fields,
        int maxFileSizeMb,
        int maxRows,
        String serialSeparator,
        boolean storeOriginalFile,
        boolean allowPartialImport,
        List<String> allowedExtensions,
        LocalDate drawDateWindowFrom,
        LocalDate drawDateWindowTo,
        List<String> supportedDateFormats,
        List<String> fixedRules
) {
}
