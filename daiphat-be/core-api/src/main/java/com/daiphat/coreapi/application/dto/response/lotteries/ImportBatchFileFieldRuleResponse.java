package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.util.List;

/**
 * One field the importer can read from a file, described for the configuration
 * panel: what it is, whether a file must carry it, and whether its cell holds one
 * value or a list.
 *
 * @param field        mapping key the client sends back, e.g. "serialsColumn"
 * @param requirement  MANDATORY, CONDITIONAL (required only in some file shapes)
 *                     or OPTIONAL
 * @param list         true when one cell holds several values separated by the
 *                     configured separator
 * @param aliases      header spellings the system recognises on its own, so the
 *                     operator can name the column and skip manual mapping
 */
@Builder
public record ImportBatchFileFieldRuleResponse(
        String field,
        String label,
        String requirement,
        boolean list,
        List<String> aliases,
        String note
) {
}
