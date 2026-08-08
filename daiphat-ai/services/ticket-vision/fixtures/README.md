# Test fixtures

This folder is where real sample ticket photos should go once available
(doc section 6: "Use 50-100 real ticket images under different conditions"
-- lighting, skew, shadows, cluttered backgrounds, single vs. multiple
tickets per photo, overlapping tickets).

None are checked in yet. The current test suite (`tests/test_contour_detector.py`,
`tests/test_ticket_parser.py`, etc.) uses synthetic images and hand-written
OCR text instead, which validates the *logic* (aspect-ratio filtering, field
regexes, status thresholds) but says nothing about real-world accuracy.

Once real photos are available:

- Add them here as `fixtures/<condition>/<n>.jpg` (e.g. `blurry/01.jpg`,
  `shadow/01.jpg`, `multi-ticket/01.jpg`).
- Add a `tests/test_real_samples.py` that runs the full
  `TicketScanService.scan_image` pipeline (with real EasyOCR/PaddleOCR, not
  the stubs used elsewhere) against them and asserts on expected
  station/serial/numbers/date, to catch regressions in
  `TICKET_VISION_MIN_TICKET_ASPECT_RATIO` and friends as they get tuned.
- Recalibrate `domain/detection/contour_detector.py`'s aspect-ratio band and
  `domain/layouts/generic_layout.py`'s header/body split against real
  measurements instead of the placeholder defaults currently in
  `infra/config.py`.
