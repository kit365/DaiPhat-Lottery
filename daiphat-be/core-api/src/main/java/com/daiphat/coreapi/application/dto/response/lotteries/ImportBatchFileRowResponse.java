package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileRowStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * One row of the uploaded file after resolution.
 *
 * <p>When the file carries tickets, a row is one lottery number plus every serial
 * printed with that number, so {@link #declareQuantity()} is the serial count
 * rather than a figure read from the file.
 *
 * @param rowNumber     1-based position in the file so the operator can find it in Excel
 * @param rawValues     the mapped cells exactly as they appear in the file, for side-by-side review
 * @param importCost    taken from the station configuration, never from the file
 * @param serialNumbers   serials that will be created, after de-duplication
 * @param ticketImages    one entry per serial, null where there is no usable image
 * @param declareQuantity what the supplier says it delivered - read from the
 *                        quantity column when the file has one, so a shortfall
 *                        stays visible instead of being defined away
 * @param serialCount     how many tickets this row will actually create
 */
@Builder
public record ImportBatchFileRowResponse(
        int rowNumber,
        Map<String, String> rawValues,
        LocalDate drawDate,
        Long lotteryStationId,
        String stationName,
        ImportBatchType resolvedBatchType,
        String numbers,
        List<String> serialNumbers,
        List<String> ticketImages,
        Integer declareQuantity,
        Integer serialCount,
        BigDecimal importCost,
        ImportBatchFileRowStatus status,
        List<ImportBatchFileIssueResponse> issues
) {

    public boolean isImportable() {
        return status == ImportBatchFileRowStatus.OK || status == ImportBatchFileRowStatus.WARNING;
    }
}
