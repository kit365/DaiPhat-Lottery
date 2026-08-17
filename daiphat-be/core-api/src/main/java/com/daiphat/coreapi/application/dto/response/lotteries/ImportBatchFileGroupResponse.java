package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileGroupStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * All rows of one draw date - the unit that becomes a single import batch.
 *
 * @param importMode              resolved by the backend; the client never chooses it
 * @param totalDeclareQuantity    tickets the supplier declared across every station
 * @param totalSerialCount        tickets the file actually carries
 * @param stations                one entry per import batch line that will be created
 * @param existingEditableBatchId set when the operator already has an open batch for
 *                                this draw date and supplier, so the UI can offer
 *                                "skip" or "create anyway"
 */
@Builder
public record ImportBatchFileGroupResponse(
        LocalDate drawDate,
        ImportBatchFileGroupStatus status,
        ImportBatchImportMode importMode,
        Integer totalDeclareQuantity,
        Integer totalSerialCount,
        BigDecimal totalDeclaredCostValue,
        Integer ticketCount,
        Long existingEditableBatchId,
        List<ImportBatchFileStationSummaryResponse> stations,
        List<ImportBatchFileIssueResponse> groupIssues,
        List<ImportBatchFileRowResponse> rows,

        /**
         * Stations whose prices in the file disagree with the station record.
         * Non-empty means the group is blocked until an operator reconciles them.
         */
        List<ImportBatchFilePricingMismatchResponse> pricingMismatches,
        /** Stations named in the file whose weekly schedule excludes this draw date. */
        List<ImportBatchFileScheduleMismatchResponse> scheduleMismatches
) {
}
