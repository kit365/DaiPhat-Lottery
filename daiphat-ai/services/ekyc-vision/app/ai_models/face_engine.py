import logging
import os
from typing import Any, Optional
import cv2
import numpy as np
from insightface.app import FaceAnalysis
from app.utils.image_decode import decode_bgr

_log = logging.getLogger(__name__)

# Global InsightFace App
_face_app: Optional[FaceAnalysis] = None

def _get_face_app() -> FaceAnalysis:
    global _face_app
    if _face_app is None:
        # buffalo_s is the fast, lightweight model set (includes ArcFace small)
        # buffalo_l is the larger, more accurate one.
        _face_app = FaceAnalysis(name='buffalo_s', providers=['CPUExecutionProvider'])
        _face_app.prepare(ctx_id=0, det_size=(640, 640))
    return _face_app

def verify_faces(selfie_bytes: bytes, id_bytes: bytes, model_name: str = "hog") -> dict[str, Any]:
    """
    Perform face matching using InsightFace (ArcFace) embeddings.
    Accuracy: Top-tier, industry standard.
    """
    try:
        # 1. Decode
        img_selfie = decode_bgr(selfie_bytes)
        img_id = decode_bgr(id_bytes)

        # 2. Extract Faces and Embeddings
        app = _get_face_app()
        
        faces_selfie = app.get(img_selfie)
        faces_id = app.get(img_id)

        if not faces_selfie or not faces_id:
            _log.warning("Face recognition (InsightFace): Could not detect face in one or both images.")
            return {
                "verified": False,
                "distance": 1.0,
                "score": 0.0,
                "method": "insightface_arcface_lite",
                "error": "Face not detected"
            }

        # 3. Use the largest face in each image
        face_s = max(faces_selfie, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]))
        face_i = max(faces_id, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]))

        emb_selfie = face_s.normed_embedding
        emb_id = face_i.normed_embedding

        # 4. Calculate Cosine Similarity
        similarity = float(np.dot(emb_selfie, emb_id))
        
        # 5. Threshold (0.4 - 0.5 is typical for ArcFace)
        # 0.35 is "relaxed" but still good for general KYC.
        threshold = 0.35
        verified = similarity >= threshold
        
        # Distance (matching the user's expected format, lower is better)
        distance = round(max(0.0, 1.0 - similarity), 4)

        _log.info("Face recognition (InsightFace) result: similarity=%.4f, verified=%s", similarity, verified)

        return {
            "verified": verified,
            "distance": distance,
            "score": round(similarity, 4),
            "threshold": threshold,
            "is_cropped": True,
            "method": "insightface_arcface_lite"
        }

    except Exception as e:
        _log.error("Face recognition error (InsightFace): %s", e)
        return {"verified": False, "distance": 1.0, "error": str(e), "method": "error"}
