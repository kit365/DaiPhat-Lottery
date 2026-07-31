# syntax=docker/dockerfile:1.7

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/app/services/chat-bot

WORKDIR /app

RUN addgroup --system daiphat \
    && adduser --system --ingroup daiphat daiphat

COPY services/chat-bot/requirements.txt /tmp/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r /tmp/requirements.txt

COPY --chown=daiphat:daiphat contracts ./contracts
COPY --chown=daiphat:daiphat infra ./infra
COPY --chown=daiphat:daiphat libs ./libs
COPY --chown=daiphat:daiphat services/chat-bot ./services/chat-bot

USER daiphat
EXPOSE 8000

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)" || exit 1

CMD ["uvicorn", "main:app", "--app-dir", "services/chat-bot", "--host", "0.0.0.0", "--port", "8000"]
