package com.daiphat.coreapi.infrastructure.dto.request.vision;

import java.util.List;

/**
 * OCR template resolved for one active station. Lets the legacy local OCR pick
 * field layouts after it has read the station name from the ticket itself.
 * {@code sampleImageUrl} is the photo the layouts were drawn on: ticket-vision
 * finds the paper edges inside the ticket frame on it, so fields are located
 * relative to the paper rather than the hand-drawn frame.
 */
public record RemoteStationTemplateMetadata(
        Long stationId,
        Long templateId,
        List<RemoteFieldLayoutMetadata> fieldLayouts,
        String sampleImageUrl
) {
}
