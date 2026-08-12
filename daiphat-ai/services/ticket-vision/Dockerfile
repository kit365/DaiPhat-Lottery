# syntax=docker/dockerfile:1.7
#
# Built with `context: ./daiphat-ai` (repo root of the AI monorepo), not
# this directory, so it can COPY the shared contracts/infra/libs packages --
# see docker-compose.yml's `ticket-vision` service. Mirrors
# daiphat-ai/Dockerfile (chat-bot), except this service gets its own image:
# EasyOCR/PaddleOCR pull in torch/paddlepaddle, which would needlessly bloat
# chat-bot's image if shared.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/app/services/ticket-vision

WORKDIR /app

RUN addgroup --system daiphat \
    && adduser --system --ingroup daiphat daiphat

# OpenCV/EasyOCR/PaddleOCR need a handful of native shared libs even in
# "headless" builds (libGL for cv2, libgomp for the ML frameworks).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY services/ticket-vision/requirements.txt /tmp/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r /tmp/requirements.txt

COPY --chown=daiphat:daiphat contracts ./contracts
COPY --chown=daiphat:daiphat infra ./infra
COPY --chown=daiphat:daiphat libs ./libs
COPY --chown=daiphat:daiphat services/ticket-vision ./services/ticket-vision

USER daiphat
EXPOSE 8090

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/health', timeout=3)" || exit 1

CMD ["uvicorn", "main:app", "--app-dir", "services/ticket-vision", "--host", "0.0.0.0", "--port", "8090"]
