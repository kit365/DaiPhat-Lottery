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

# paddleocr/imgaug pull opencv-python and opencv-contrib-python on top of the pinned
# headless build; keep a single cv2 build so their native libs don't overwrite each other.
RUN pip uninstall -y opencv-python opencv-contrib-python opencv-python-headless && \
    pip install --no-cache-dir --no-deps opencv-python-headless==4.10.0.84 && \
    python -c "import cv2; print('cv2', cv2.__version__)"

# libpaddle.so shadows the system zlib symbols; without the preload every zlib call made
# after `import paddle` (requests, PaddleOCR init) crashes in inflateReset2.
ENV LD_PRELOAD=libz.so.1
ENV PYTHONUNBUFFERED=1
# Ensure InsightFace can download models to a writable directory
ENV INSIGHTFACE_HOME=/app/.insightface

# Pre-load PaddleOCR models; a crash here must fail the build instead of the first eKYC request.
RUN mkdir -p /app/.paddleocr && \
    python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='vi', show_log=False, enable_mkldnn=False)"

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
