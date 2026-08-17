package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileRowStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The shape a preview row takes when several lines of a file share one lottery
 * number - the case that made the preview look like it was repeating tickets.
 */
class ImportBatchFileRowResponseTest {

    private ImportBatchFileRowResponse.ImportBatchFileRowResponseBuilder row(int rowNumber) {
        return ImportBatchFileRowResponse.builder()
                .rowNumber(rowNumber)
                .numbers("100000")
                .status(ImportBatchFileRowStatus.OK)
                .issues(List.of());
    }

    @Test
    @DisplayName("The line that keeps the ticket is not marked as merged away")
    void absorbingLineIsNotMergedAway() {
        ImportBatchFileRowResponse absorbing = row(16)
                .serialNumbers(List.of("CM1000001", "CM1000002", "CM1000003", "CM1000004"))
                .serialCount(4)
                .declareQuantity(4)
                .build();

        assertThat(absorbing.isMergedAway()).isFalse();
        assertThat(absorbing.isImportable()).isTrue();
    }

    @Test
    @DisplayName("A line whose serials moved points at the line that took them")
    void mergedLinePointsAtItsTarget() {
        ImportBatchFileRowResponse merged = row(17)
                .serialNumbers(List.of("CM1000002"))
                .serialCount(1)
                .declareQuantity(1)
                .status(ImportBatchFileRowStatus.SKIPPED)
                .mergedIntoRowNumber(16)
                .build();

        assertThat(merged.isMergedAway()).isTrue();
        assertThat(merged.mergedIntoRowNumber()).isEqualTo(16);
        // Skipped, so it never becomes a batch line of its own - the serial is
        // imported once, through row 16.
        assertThat(merged.isImportable()).isFalse();
    }

    @Test
    @DisplayName("Rows from an older response carry no pointer and are not merged")
    void absentPointerMeansNotMerged() {
        assertThat(row(18).build().isMergedAway()).isFalse();
    }
}
