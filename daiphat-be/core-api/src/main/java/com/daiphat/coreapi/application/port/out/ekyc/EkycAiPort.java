package com.daiphat.coreapi.application.port.out.ekyc;

/**
 * Outbound port to the ekyc-vision Python microservice
 * ({@code /internal/v1/liveness}, {@code /face/verify}, {@code /ocr/id-card}).
 */
public interface EkycAiPort {

    boolean isHealthy();

    EkycLivenessResult liveness(byte[] selfieBytes);

    EkycFaceVerifyResult faceVerify(byte[] selfieBytes, byte[] idFrontBytes);

    EkycOcrResult ocrIdCard(byte[] frontBytes, byte[] backBytes);
}
