package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.time.LocalDate;

/**
 * Outcome for one draw date of a bulk file import. Each batch is created in its
 * own transaction, so one failure does not discard the batches that succeeded.
 *
 * @param lineCount            import batch lines created - one per station
 * @param declaredSerialCount  physical tickets the file declared for this date
 * @param importedSerialCount  physical tickets actually created; a smaller number
 *                             means the batch is left partially imported on purpose
 * @param ticketCount          distinct lottery numbers created
 */
@Builder
public record ImportBatchFileImportItemResultResponse(
        LocalDate drawDate,
        boolean success,
        Long importBatchId,
        String batchCode,
        Integer lineCount,
        Integer ticketCount,
        Integer declaredSerialCount,
        Integer importedSerialCount,
        String errorCode,
        String message
) {
}
