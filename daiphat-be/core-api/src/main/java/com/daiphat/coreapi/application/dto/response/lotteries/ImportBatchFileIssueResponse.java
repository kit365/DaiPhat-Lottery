package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileIssueCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileIssueSeverity;
import lombok.Builder;

import java.util.List;

/**
 * One problem found on a row or a draw-date group.
 *
 * @param column      column the problem belongs to, or null for a row/group level issue
 * @param suggestions candidate stations, only populated for an ambiguous station name
 */
@Builder
public record ImportBatchFileIssueResponse(
        String column,
        ImportBatchFileIssueCode code,
        ImportBatchFileIssueSeverity severity,
        String message,
        List<ImportBatchFileStationSuggestionResponse> suggestions
) {

    public static ImportBatchFileIssueResponse of(ImportBatchFileIssueCode code) {
        return of(code, null, code.getDefaultMessage(), List.of());
    }

    public static ImportBatchFileIssueResponse of(ImportBatchFileIssueCode code, String column) {
        return of(code, column, code.getDefaultMessage(), List.of());
    }

    public static ImportBatchFileIssueResponse of(
            ImportBatchFileIssueCode code,
            String column,
            String message,
            List<ImportBatchFileStationSuggestionResponse> suggestions
    ) {
        return ImportBatchFileIssueResponse.builder()
                .column(column)
                .code(code)
                .severity(code.getSeverity())
                .message(message == null || message.isBlank() ? code.getDefaultMessage() : message)
                .suggestions(suggestions == null ? List.of() : suggestions)
                .build();
    }
}
