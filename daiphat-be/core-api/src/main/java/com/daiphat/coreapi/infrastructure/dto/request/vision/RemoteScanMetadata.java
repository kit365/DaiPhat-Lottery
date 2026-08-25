package com.daiphat.coreapi.infrastructure.dto.request.vision;

import java.util.List;

/**
 * Matches ticket-vision's ScanMetadata -- serialized to JSON and sent as
 * the "metadata" multipart form field alongside the image on POST /v1/scan.
 */
public record RemoteScanMetadata(
        List<RemoteStationMetadata> activeStations,
        Integer maxTickets,
        String detectorStrategy,
        String recognitionEngine
) {
}
