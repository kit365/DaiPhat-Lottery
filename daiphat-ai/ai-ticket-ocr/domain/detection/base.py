from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import numpy as np


@dataclass
class DetectedRegion:
    """One candidate ticket found in the source photo.

    bbox is the axis-aligned rectangle (x, y, width, height) in the source
    image's pixel coordinates -- cheap to send to the mobile app for a simple
    overlay. corners are the four ordered points (top-left, top-right,
    bottom-right, bottom-left) of the ticket's actual (possibly skewed)
    outline, used to do the perspective warp and to draw a precise overlay
    that hugs the real ticket edges (see doc section 10, "mixed-reality-like
    experience").
    """

    bbox: tuple[int, int, int, int]
    corners: list[tuple[int, int]] = field(default_factory=list)


@dataclass
class DetectionResult:
    regions: list[DetectedRegion]
    warnings: list[str] = field(default_factory=list)


class TicketDetectorStrategy(ABC):
    """Strategy interface for locating individual tickets in a photo.

    Two implementations are expected over the project's lifetime (see doc
    section 9, "Ticket detection approaches"):
      - ContourTicketDetector (MVP): OpenCV contour detection + aspect-ratio
        filtering. Cheap, no training data, struggles with overlapping
        tickets.
      - YoloTicketDetector (Production / Phase 2): fine-tuned YOLOv8 model,
        higher accuracy on overlapping/cluttered photos. Not implemented yet
        -- TicketDetectorFactory is the seam where it plugs in.
    """

    @abstractmethod
    def detect(self, image: np.ndarray) -> DetectionResult:
        """Find candidate ticket regions in a full source photo (BGR, as
        decoded by cv2.imdecode)."""
        raise NotImplementedError
