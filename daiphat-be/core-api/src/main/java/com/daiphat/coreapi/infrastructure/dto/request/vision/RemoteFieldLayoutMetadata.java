package com.daiphat.coreapi.infrastructure.dto.request.vision;

/**
 * Normalized field ROI (0–1) from ocr_field_layouts for template-guided OCR.
 * Multiple rows may share the same fieldName; lower priority is tried first.
 */
public record RemoteFieldLayoutMetadata(
        Long id,
        String fieldName,
        int priority,
        double x,
        double y,
        double width,
        double height,
        boolean required
) {
}
