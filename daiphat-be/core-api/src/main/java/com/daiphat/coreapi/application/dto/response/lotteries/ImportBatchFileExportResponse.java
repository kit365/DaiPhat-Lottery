package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

/**
 * A generated .xlsx delivery note, ready to stream to the browser.
 *
 * @param content        the workbook bytes; already encoded, so the controller
 *                       streams them untouched
 * @param carriesTickets true when the batch had tickets, so the file uses the
 *                       ticket schema; false means a declaration-only file
 */
@Builder
public record ImportBatchFileExportResponse(
        String fileName,
        byte[] content,
        boolean carriesTickets
) {
}
