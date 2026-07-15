from fastapi import APIRouter, FastAPI

from classifier import classify_intent
from contracts.api_response import APIResponse
from dream_book import build_fortune_reply
from dto.request.chat_classify_request import ChatClassifyRequest
from dto.request.chat_generate_request import ChatGenerateRequest
from dto.response.chat_generate_response import ChatGenerateResponse
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
        return APIResponse.ok(data=result.model_dump())
    except Exception as e:
        return APIResponse.fail(message=str(e))


@chat_router.post("/generate", response_model=APIResponse)
def generate_message(request: ChatGenerateRequest):
    try:
        reply, lucky_numbers, symbol = build_fortune_reply(request.message)
        result = ChatGenerateResponse(
            reply=reply,
            luckyNumbers=lucky_numbers,
            symbol=symbol,
        )
        return APIResponse.ok(data=result.model_dump())
    except Exception as e:
        return APIResponse.fail(message=str(e))


app.include_router(chat_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["System"])
def health_check():
    return APIResponse.ok(data={"status": "up"})


if __name__ == "__main__":
    import uvicorn

    # Cho phép bấm Run trong IDE: python main.py
    # Swagger: http://127.0.0.1:8000/docs
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
