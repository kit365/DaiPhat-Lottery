"""Cấu hình logging: uvicorn gắn handler trước, basicConfig() không force sẽ không có tác dụng → log app.* không ra console."""

from __future__ import annotations

import logging
import os


def configure_logging() -> None:
    raw = (os.getenv("LOG_LEVEL") or "INFO").upper()
    level = getattr(logging, raw, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
        force=True,
    )
    logging.getLogger("app").setLevel(level)
    logging.getLogger("app.ai_models").setLevel(level)
    logging.getLogger("app.api").setLevel(level)
    logging.getLogger("app.services").setLevel(level)
