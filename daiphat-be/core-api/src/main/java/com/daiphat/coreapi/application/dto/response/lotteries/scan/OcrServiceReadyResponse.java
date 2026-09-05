package com.daiphat.coreapi.application.dto.response.lotteries.scan;

/**
 * Admin OCR import modal readiness for the ticket-vision microservice.
 */
public record OcrServiceReadyResponse(
        boolean ready,
        String message
) {
}
