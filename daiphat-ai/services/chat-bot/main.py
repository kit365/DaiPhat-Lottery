from fastapi import APIRouter
from dto.request.chat_classify_request import ChatClassifyRequest
from dto.request.chat_generate_request import ChatGenerateRequest
from dto.response.chat_classify_response import ChatClassifyResponse
from dto.response.chat_generate_response import ChatGenerateResponse
from .classifier import classify_intent
from contracts.api_response import APIResponse
from infra.config import settings
from fastapi import FastAPI

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
        return APIResponse.ok(data=result.model_dump())
    except Exception as e:
        return APIResponse.fail(message=str(e))


@chat_router.post("/generate", response_model=APIResponse)
def generate_message(request: ChatGenerateRequest):
    try:
        reply = (
            "Đại Phát đã ghi nhận câu hỏi của bạn. "
            "Tính năng tư vấn phong thủy đang được hoàn thiện — bạn có thể hỏi lịch quay, kết quả xổ số hoặc gặp nhân viên hỗ trợ."
        )
        result = ChatGenerateResponse(reply=reply)
        return APIResponse.ok(data=result.model_dump())
    except Exception as e:
        return APIResponse.fail(message=str(e))


app.include_router(chat_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System"])
def health_check():
    return APIResponse.ok(data={"status": "up"})
