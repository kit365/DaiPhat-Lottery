import os

# Trước mọi import dùng Paddle/PaddleOCR — giảm deadlock OpenMP / xung đột MKL trên macOS (Apple Silicon).
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "True"

from app.api.app_factory import create_app

app = create_app()

