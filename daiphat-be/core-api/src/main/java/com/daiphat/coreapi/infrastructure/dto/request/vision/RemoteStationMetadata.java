package com.daiphat.coreapi.infrastructure.dto.request.vision;

import java.util.List;

/**
 * Matches ticket-vision's StationMetadata
 * (services/ticket-vision/dto/request/scan_metadata.py). Java is the
 * source of truth for stations, so a real scan call always populates this
 * -- ticket-vision's own bootstrap station list is only a fallback for
 * when this is omitted (e.g. calling the Python service directly for
 * manual testing).
 */
public record RemoteStationMetadata(
        Long id,
        String name,
        String code,
        List<String> aliases,
        Integer expectedNumberLength
) {
}
