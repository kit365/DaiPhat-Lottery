from fastapi import FastAPI, APIRouter
from pydantic import BaseModel
from dto.request.chat_classify_request import ChatClassifyRequest
from dto.response.chat_classify_response import ChatClassifyResponse
from .classifier import classify_intent
from contracts.api_response import APIResponse
from infra.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="NLP and Intent Classification for DaiPhat Lottery Platform",
    version=settings.VERSION,
)

chat_router = APIRouter(prefix="/chat", tags=["Chat"])

@chat_router.post("/classify", response_model=APIResponse)
def classify_message(request: ChatClassifyRequest):
    try:
        result = classify_intent(request.message, request.conversation_id)
        return APIResponse.ok(data=result.dict())
    except Exception as e:
        return APIResponse.fail(message=str(e))

app.include_router(chat_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
def health_check():
    return APIResponse.ok(data={"status": "up"})
