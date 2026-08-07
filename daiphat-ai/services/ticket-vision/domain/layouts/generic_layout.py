import numpy as np

from domain.layouts.base import TicketLayoutStrategy

# Placeholder split -- not calibrated against real ticket photos yet (doc
# section 6 calls for 50-100 real samples under different conditions, which
# this sandbox doesn't have). Station name conventionally sits in the top
# band of a Vietnamese lottery ticket header; everything else (serial,
# numbers, draw date) sits in the body below it.
HEADER_HEIGHT_RATIO = 0.3


class GenericLayoutStrategy(TicketLayoutStrategy):
    """Fallback layout used for every station until per-station layouts are
    calibrated (doc section 9: "Fallback: GenericOcrStrategy. Mark
    unfamiliar tickets as NEEDS_REVIEW" -- the "unfamiliar" signal here is
    that the parser only found a low-confidence or no station match, which
    the validator/status-resolver already surfaces via missing/low-confidence
    stationName)."""

    def get_regions(self, ocr_ready_crop: np.ndarray) -> dict[str, np.ndarray]:
        height = ocr_ready_crop.shape[0]
        split = max(int(height * HEADER_HEIGHT_RATIO), 1)
        return {
            "header": ocr_ready_crop[:split, :],
            "body": ocr_ready_crop[split:, :],
        }
