package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import jakarta.validation.constraints.NotBlank;

/**
 * One ticket the mobile user confirmed (or manually corrected) after
 * reviewing /lottery-tickets/scan results. stationId and drawDate are
 * intentionally NOT here -- both are fixed by the parent request's
 * importBatchLineId (a batch line already commits to exactly one station
 * and draw date; see BatchImportScannedTicketsRequest).
 */
public record ConfirmedScannedTicketRequest(
        @NotBlank(message = "Dãy số không được để trống")
        String numbers,

        @NotBlank(message = "Số sê-ri không được để trống")
        String serialNumber,

        /** Base64 JPEG from the scan step's cropped preview, if any (doc Flow 2). */
        String ticketImageBase64,

        /**
         * Echoes {@link com.daiphat.coreapi.application.dto.response.lotteries.scan.ScannedTicketResponse#ocrScanResultId()}
         * from the scan step, when this ticket came from OCR. Null when the
         * ticket was entered without ever going through OCR. Used to log
         * MANUAL_INPUT vs OCR_COMPLETED-confirmed in Lottery_Scan_Log
         * (DP-269 follow-up) — never affects persistence of the ticket itself.
         */
        Long ocrScanResultId
) {
}
