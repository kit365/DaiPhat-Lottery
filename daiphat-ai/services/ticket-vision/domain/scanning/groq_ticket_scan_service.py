"""Groq.com vision ticket scan — default recognition provider for OCR Scan Vé."""

from __future__ import annotations

from domain.scanning.llm_ticket_scan_service import LlmTicketScanService
from domain.validation.format_validator import FormatValidator
from infra.groq_client import GroqVisionClient


class GroqTicketScanService(LlmTicketScanService):
    """Scan tickets via Groq vision; maps to the same ScanResponse as Gemini/Grok/legacy."""

    def __init__(
        self,
        groq_client=None,
        validator: FormatValidator | None = None,
        max_file_size_mb: int = 5,
        max_image_dimension: int = 1920,
        max_tickets_per_image: int = 15,
        station_fuzzy_threshold: int = 80,
        high_confidence_threshold: float = 0.85,
        low_confidence_threshold: float = 0.70,
        include_cropped_image: bool = True,
    ) -> None:
        super().__init__(
            vision_client=groq_client or GroqVisionClient(),
            provider_label="Groq",
            validator=validator,
            max_file_size_mb=max_file_size_mb,
            max_image_dimension=max_image_dimension,
            max_tickets_per_image=max_tickets_per_image,
            station_fuzzy_threshold=station_fuzzy_threshold,
            high_confidence_threshold=high_confidence_threshold,
            low_confidence_threshold=low_confidence_threshold,
            include_cropped_image=include_cropped_image,
        )
