"""OCR API DTOs (for OpenAPI / future response_model)."""

from typing import Optional

from pydantic import BaseModel


class IdCardFields(BaseModel):
    name: Optional[str] = None
    id_number: Optional[str] = None
    dob: Optional[str] = None
    address: Optional[str] = None
    expiry_date: Optional[str] = None
