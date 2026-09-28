from abc import ABC, abstractmethod

import numpy as np


class TicketLayoutStrategy(ABC):
    """Strategy interface for splitting a rectified ticket crop into the
    named sub-regions the doc asks OCR to target ("header/body" -- doc
    section 4, Flow 1): station name typically prints in the header band,
    serial number / lottery numbers / draw date in the body.

    Selecting *which* layout to use is a chicken-and-egg problem: the
    station is exactly the thing OCR still needs to read. For now
    LayoutStrategyFactory always resolves to GenericLayoutStrategy; the
    seam exists so a later pass (e.g. a cheap first-pass OCR that guesses
    the station, then a station-tuned second pass) can plug in real
    per-station region calibration without touching callers.
    """

    @abstractmethod
    def get_regions(self, ocr_ready_crop: np.ndarray) -> dict[str, np.ndarray]:
        """Return named sub-image crops, e.g. {"header": ..., "body": ...}."""
        raise NotImplementedError
