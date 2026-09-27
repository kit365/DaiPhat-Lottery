# syntax=docker/dockerfile:1.7
#
# Built with this directory as the context: the service is self-contained,
# including its contracts/infra/libs packages. It keeps its own image because
# EasyOCR/PaddleOCR pull in torch/paddlepaddle, which the chatbot never needs.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    HOME=/cache

WORKDIR /app

# /app must be writable: the LLM quota counter lives under data/ next to the code.
RUN addgroup --system daiphat \
    && adduser --system --ingroup daiphat daiphat \
    && mkdir -p \
        /cache/easyocr \
        /cache/paddlex \
        /cache/huggingface \
        /cache/torch \
        /cache/ultralytics \
    && chown -R daiphat:daiphat /cache /app

# OpenCV/EasyOCR/PaddleOCR need a handful of native shared libs even in
# "headless" builds (libGL for cv2, libgomp for the ML frameworks).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r /tmp/requirements.txt

COPY --chown=daiphat:daiphat . ./

USER daiphat
EXPOSE 8090

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/health', timeout=3)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090", "--workers", "1"]
