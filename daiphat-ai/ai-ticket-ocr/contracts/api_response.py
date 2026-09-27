from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime

class APIResponse(BaseModel):
    success: bool = True
    timestamp: datetime = Field(default_factory=datetime.now)
    message: Optional[str] = None
    data: Optional[Any] = None

    @classmethod
    def ok(cls, data: Any = None, message: str = "Success"):
        return cls(success=True, data=data, message=message)
        
    @classmethod
    def fail(cls, message: str = "Error", data: Any = None):
        return cls(success=False, data=data, message=message)
