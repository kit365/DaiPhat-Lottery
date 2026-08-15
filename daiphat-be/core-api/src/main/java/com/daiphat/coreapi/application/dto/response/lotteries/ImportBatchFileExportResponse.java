package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

/**
 * A generated CSV, ready to stream to the browser.
 *
 * @param carriesTickets true when the batch had tickets, so the file uses the
 *                       ticket schema; false means a declaration-only file
 */
@Builder
public record ImportBatchFileExportResponse(
        String fileName,
        String content,
        boolean carriesTickets
) {
}
