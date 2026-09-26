"""OCR API DTOs (for OpenAPI / future response_model)."""

from typing import Literal, Optional

from pydantic import BaseModel


class IdCardFields(BaseModel):
    personal_identification_number: Optional[str] = None
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    place_of_birth_registration: Optional[str] = None
    place_of_residence: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    # Legacy aliases
    name: Optional[str] = None
    id_number: Optional[str] = None
    dob: Optional[str] = None
    address: Optional[str] = None


class MergedIdCardFields(IdCardFields):
    card_layout: Optional[str] = None
    # Side each field was read from, or the side to retake when the field is missing.
    field_sides: dict[str, Literal["front", "back"]] = {}
