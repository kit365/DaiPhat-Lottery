package com.daiphat.coreapi.application.service.ekyc;

import com.daiphat.coreapi.application.dto.ekyc.EkycVerificationResult;
import com.daiphat.coreapi.application.port.out.ekyc.EkycAiPort;
import com.daiphat.coreapi.application.port.out.ekyc.EkycFaceVerifyResult;
import com.daiphat.coreapi.application.port.out.ekyc.EkycLivenessResult;
import com.daiphat.coreapi.application.port.out.ekyc.EkycOcrResult;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.ekyc.EkycStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Shared eKYC orchestration (EduSpace order: liveness → face → OCR).
 * Returns a result for persistence; use {@link #assertVerified} to map failures to domain errors.
 */
@Service
@RequiredArgsConstructor
public class EkycVerificationService {

    private final EkycAiPort ekycAiPort;
    private final StoredImageFetcher storedImageFetcher;

    @Value("${daiphat.ekyc-ai.face-distance-threshold:0.55}")
    private double faceDistanceThreshold;

    @Value("${daiphat.ekyc-ai.liveness-min-score:0.08}")
    private double livenessMinScore;

    public EkycVerificationResult verifyFromUrls(String frontUrl, String backUrl, String selfieUrl) {
        if (!StringUtils.hasText(frontUrl) || !StringUtils.hasText(selfieUrl)) {
            throw new DomainException(ErrorCode.EKYC_INVALID_DOCUMENTS);
        }
        byte[] front = storedImageFetcher.fetchBytes(frontUrl);
        byte[] selfie = storedImageFetcher.fetchBytes(selfieUrl);
        byte[] back = StringUtils.hasText(backUrl) ? storedImageFetcher.fetchBytes(backUrl) : null;
        return verify(front, back, selfie);
    }

    public EkycVerificationResult verify(byte[] frontBytes, byte[] backBytes, byte[] selfieBytes) {
        if (frontBytes == null || frontBytes.length == 0 || selfieBytes == null || selfieBytes.length == 0) {
            throw new DomainException(ErrorCode.EKYC_INVALID_DOCUMENTS);
        }

        EkycLivenessResult live = ekycAiPort.liveness(selfieBytes);
        EkycFaceVerifyResult face = ekycAiPort.faceVerify(selfieBytes, frontBytes);
        EkycOcrResult ocr = ekycAiPort.ocrIdCard(frontBytes, backBytes);

        boolean livenessPass = live.live() && live.score() >= livenessMinScore;
        boolean facePass = face.verified() && face.distance() <= faceDistanceThreshold;
        boolean ocrPass = StringUtils.hasText(ocr.idNumber());

        if (!livenessPass) {
            return failed(ocr, face.distance(), live.score(), "Liveness failed");
        }
        if (!facePass) {
            return failed(ocr, face.distance(), live.score(), "Face mismatch");
        }
        if (!ocrPass) {
            return failed(
                    ocr,
                    face.distance(),
                    live.score(),
                    StringUtils.hasText(ocr.error()) ? ocr.error() : "OCR failed"
            );
        }

        return new EkycVerificationResult(
                EkycStatus.VERIFIED,
                ocr.name(),
                digitsOnly(ocr.idNumber()),
                ocr.dob(),
                ocr.address(),
                face.distance(),
                live.score(),
                Math.max(0, Math.min(1, 1.0 - face.distance())),
                null
        );
    }

    public void assertVerified(EkycVerificationResult result) {
        if (result == null || result.verified()) {
            return;
        }
        String reason = result.failureReason() == null ? "" : result.failureReason().toLowerCase();
        if (reason.contains("liveness")) {
            throw new DomainException(ErrorCode.EKYC_LIVENESS_FAILED);
        }
        if (reason.contains("face")) {
            throw new DomainException(ErrorCode.EKYC_FACE_MISMATCH);
        }
        throw new DomainException(ErrorCode.EKYC_OCR_FAILED);
    }

    public void requireIdMatch(String expectedIdNumber, EkycVerificationResult result) {
        String expected = digitsOnly(expectedIdNumber);
        String actual = digitsOnly(result.ocrIdNumber());
        if (!StringUtils.hasText(expected) || !expected.equals(actual)) {
            throw new DomainException(ErrorCode.EKYC_ID_MISMATCH);
        }
    }

    private static EkycVerificationResult failed(
            EkycOcrResult ocr,
            double faceDistance,
            double livenessScore,
            String reason
    ) {
        return new EkycVerificationResult(
                EkycStatus.FAILED,
                ocr != null ? ocr.name() : null,
                ocr != null ? digitsOnly(ocr.idNumber()) : null,
                ocr != null ? ocr.dob() : null,
                ocr != null ? ocr.address() : null,
                faceDistance,
                livenessScore,
                null,
                reason
        );
    }

    public static String digitsOnly(String value) {
        if (value == null) {
            return null;
        }
        String digits = value.replaceAll("\\D+", "");
        return digits.isBlank() ? null : digits;
    }
}
