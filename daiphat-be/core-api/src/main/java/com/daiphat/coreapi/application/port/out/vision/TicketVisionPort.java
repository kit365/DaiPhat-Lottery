package com.daiphat.coreapi.application.port.out.vision;

import com.daiphat.coreapi.infrastructure.dto.request.vision.RemoteScanMetadata;
import com.daiphat.coreapi.infrastructure.dto.response.vision.RemoteTicketScanResult;

/**
 * Outbound port to the ticket-vision Python microservice (DP-269): image
 * preprocessing, ticket detection and OCR. Pure inference on the other
 * side -- this call never persists anything.
 */
public interface TicketVisionPort {

    /**
     * Lightweight readiness probe (GET /health). Used by Admin OCR import
     * modal so operators see a clear message before uploading images.
     */
    boolean isHealthy();

    /**
     * @throws com.daiphat.coreapi.domain.exception.DomainException
     *         (TICKET_SCAN_SERVICE_UNAVAILABLE) if the service can't be
     *         reached or returns an unsuccessful/malformed response --
     *         unlike the best-effort chat/fortune AI calls, a scan
     *         request has no useful fallback and must surface the failure.
     */
    RemoteTicketScanResult scan(byte[] imageBytes, String fileName, RemoteScanMetadata metadata);
}
