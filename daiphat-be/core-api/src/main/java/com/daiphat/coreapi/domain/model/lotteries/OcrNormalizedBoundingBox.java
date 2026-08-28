package com.daiphat.coreapi.domain.model.lotteries;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Normalized ROI box (0–1 relative to ticket crop) for OCR field layouts.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OcrNormalizedBoundingBox {

    private double x;
    private double y;
    private double width;
    private double height;
}
