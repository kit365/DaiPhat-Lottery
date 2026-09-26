import numpy as np

from domain.layouts.base import TicketLayoutStrategy

# Placeholder split -- not calibrated against real ticket photos yet (doc
# section 6 calls for 50-100 real samples under different conditions, which
# this sandbox doesn't have). Station name conventionally sits in the top
# band of a Vietnamese lottery ticket header; everything else (serial,
# numbers, draw date) sits in the body below it.
HEADER_HEIGHT_RATIO = 0.3

# Padding applied on both sides of the header/body split, as a fraction of
# crop height. A hard cut at exactly HEADER_HEIGHT_RATIO can slice straight
# through a text line whose printed position straddles that boundary (e.g.
# a station name or number that sits right around the 30% mark on a given
# ticket layout), truncating it into two unreadable halves instead of one
# clean line either OCR pass could read whole. Overlapping the two crops by
# this margin means such a line is captured intact by at least one of them;
# the parser already tolerates (and benefits from) seeing the same line
# twice, since a value read more than once is preferred over a one-off read.
HEADER_OVERLAP_RATIO = 0.05


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
        overlap = max(int(height * HEADER_OVERLAP_RATIO), 1)
        header_end = min(split + overlap, height)
        body_start = max(split - overlap, 0)
        return {
            "header": ocr_ready_crop[:header_end, :],
            "body": ocr_ready_crop[body_start:, :],
        }
