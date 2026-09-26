import logging
import os
import sys
from typing import Any, Optional

import cv2
import numpy as np

from app.utils.image_decode import decode_bgr

_log = logging.getLogger(__name__)


def _prepare_windows_torch_dlls() -> None:
    """InsightFace pulls torch; on Windows shm.dll must resolve via add_dll_directory + import torch first."""
    if sys.platform != "win32":
        return
    candidates = [
        os.path.join(sys.prefix, "Lib", "site-packages", "torch", "lib"),
        os.path.join(os.path.dirname(sys.executable), "..", "Lib", "site-packages", "torch", "lib"),
    ]
    for raw in candidates:
        path = os.path.abspath(raw)
        if os.path.isdir(path):
            try:
                os.add_dll_directory(path)
            except Exception:
                pass
    try:
        import torch  # noqa: F401

        _log.debug("torch preloaded for InsightFace (%s)", getattr(torch, "__version__", "?"))
    except Exception as exc:  # noqa: BLE001
        _log.warning("torch preload failed (InsightFace may be unavailable): %s", exc)


_prepare_windows_torch_dlls()

try:
    from insightface.app.face_analysis import FaceAnalysis

    _INSIGHTFACE_AVAILABLE = True
except Exception as _e:  # noqa: BLE001
    _log.warning(
        "InsightFace could not be loaded: %s. Street Agent face verify will fail until this is fixed.",
        _e,
    )
    FaceAnalysis = None
    _INSIGHTFACE_AVAILABLE = False

_face_app: Optional[Any] = None


def _get_face_app() -> Optional[Any]:
    global _face_app
    if not _INSIGHTFACE_AVAILABLE or FaceAnalysis is None:
        return None
    if _face_app is None:
        try:
            # buffalo_s = fast ArcFace set; CPUExecutionProvider avoids CUDA deps.
            _face_app = FaceAnalysis(name="buffalo_s", providers=["CPUExecutionProvider"])
            _face_app.prepare(ctx_id=0, det_size=(640, 640))
        except Exception as e:  # noqa: BLE001
            _log.error("Failed to initialize FaceAnalysis: %s", e)
            return None
    return _face_app


def verify_faces(selfie_bytes: bytes, id_bytes: bytes, model_name: str = "hog") -> dict[str, Any]:
    """
    Face matching via InsightFace (ArcFace) embeddings.
    """
    try:
        img_selfie = decode_bgr(selfie_bytes)
        img_id = decode_bgr(id_bytes)

        app = _get_face_app()
        if app is None:
            _log.error("Face recognition (InsightFace) is not available on this host.")
            return {
                "verified": False,
                "distance": 1.0,
                "score": 0.0,
                "method": "insightface_unavailable",
                "error": "InsightFace engine is not available on this host environment",
            }

        faces_selfie = app.get(img_selfie)
        faces_id = app.get(img_id)

        if not faces_selfie or not faces_id:
            _log.warning("InsightFace: could not detect face in one or both images.")
            return {
                "verified": False,
                "distance": 1.0,
                "score": 0.0,
                "method": "insightface_arcface_lite",
                "error": "Face not detected",
            }

        face_s = max(faces_selfie, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
        face_i = max(faces_id, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))

        emb_selfie = face_s.normed_embedding
        emb_id = face_i.normed_embedding

        similarity = float(np.dot(emb_selfie, emb_id))
        threshold = 0.35
        verified = similarity >= threshold
        distance = round(max(0.0, 1.0 - similarity), 4)

        _log.info("InsightFace result: similarity=%.4f, verified=%s", similarity, verified)

        return {
            "verified": verified,
            "distance": distance,
            "score": round(similarity, 4),
            "threshold": threshold,
            "is_cropped": True,
            "method": "insightface_arcface_lite",
        }

    except Exception as e:  # noqa: BLE001
        _log.error("Face recognition error (InsightFace): %s", e)
        return {"verified": False, "distance": 1.0, "score": 0.0, "error": str(e), "method": "error"}
