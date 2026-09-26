package com.daiphat.coreapi.infrastructure.adapter.out.ekyc;

final class EkycAiApiConstants {

    static final String HEALTH_PATH = "/health";
    static final String LIVENESS_PATH = "/internal/v1/liveness";
    static final String FACE_VERIFY_PATH = "/internal/v1/face/verify";
    static final String OCR_ID_CARD_PATH = "/internal/v1/ocr/id-card";
    static final String API_KEY_HEADER = "X-API-Key";

    private EkycAiApiConstants() {
    }
}
