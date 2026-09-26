# Stage 1: Builder
FROM python:3.10-slim-bookworm as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ gcc python3-dev \
    libgomp1 libglib2.0-0 libsm6 libxext6 libxrender1 libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install to /install directory to copy easily later
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.10-slim-bookworm

WORKDIR /app

# Install runtime-only system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 libglib2.0-0 libsm6 libxext6 libxrender1 libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python packages from builder
COPY --from=builder /install /usr/local

ENV PYTHONUNBUFFERED=1
# Ensure InsightFace can download models to a writable directory
ENV INSIGHTFACE_HOME=/app/.insightface

# Pre-load PaddleOCR models (optional, but good for speed)
RUN mkdir -p /app/.paddleocr && \
    python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='vi', show_log=False, enable_mkldnn=False)" || true

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
