package com.daiphat.coreapi.application.service.ekyc;

import com.daiphat.coreapi.application.dto.ekyc.EkycVerificationResult;
import com.daiphat.coreapi.application.port.out.ekyc.EkycAiPort;
import com.daiphat.coreapi.application.port.out.ekyc.EkycFaceVerifyResult;
import com.daiphat.coreapi.application.port.out.ekyc.EkycLivenessResult;
import com.daiphat.coreapi.application.port.out.ekyc.EkycOcrResult;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.ekyc.EkycStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EkycVerificationServiceTest {

    @Mock private EkycAiPort ekycAiPort;
    @Mock private StoredImageFetcher storedImageFetcher;

    @InjectMocks
    private EkycVerificationService service;

    private final byte[] front = new byte[]{1, 2, 3};
    private final byte[] back = new byte[]{4, 5};
    private final byte[] selfie = new byte[]{6, 7, 8};

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "faceDistanceThreshold", 0.55);
        ReflectionTestUtils.setField(service, "livenessMinScore", 0.08);
    }

    private static EkycLivenessResult liveOk() {
        return new EkycLivenessResult(true, 0.5, "laplacian", null);
    }

    private static EkycFaceVerifyResult faceOk() {
        return new EkycFaceVerifyResult(true, 0.3, 0.7, "insightface", null);
    }

    private static EkycOcrResult ocrOk(String id) {
        return new EkycOcrResult(true, "Nguyen Van A", id, "01/01/1990", "Ha Noi", null, null);
    }

    @Test
    void verify_success_whenLivenessFaceAndOcrPass() {
        when(ekycAiPort.liveness(selfie)).thenReturn(liveOk());
        when(ekycAiPort.faceVerify(selfie, front)).thenReturn(faceOk());
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(ocrOk("079123456789"));

        EkycVerificationResult result = service.verify(front, back, selfie);

        assertTrue(result.verified());
        assertEquals(EkycStatus.VERIFIED, result.status());
        assertEquals("079123456789", result.ocrIdNumber());
        assertEquals("Nguyen Van A", result.ocrName());
    }

    @Test
    void verify_failsOnLiveness() {
        when(ekycAiPort.liveness(selfie)).thenReturn(new EkycLivenessResult(false, 0.01, "laplacian", null));
        when(ekycAiPort.faceVerify(selfie, front)).thenReturn(faceOk());
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(ocrOk("123"));

        EkycVerificationResult result = service.verify(front, back, selfie);

        assertFalse(result.verified());
        assertEquals(EkycStatus.FAILED, result.status());
        assertEquals(ErrorCode.EKYC_LIVENESS_FAILED,
                assertThrows(DomainException.class, () -> service.assertVerified(result)).getErrorCode());
    }

    @Test
    void verify_failsOnFaceMismatch() {
        when(ekycAiPort.liveness(selfie)).thenReturn(liveOk());
        when(ekycAiPort.faceVerify(selfie, front))
                .thenReturn(new EkycFaceVerifyResult(false, 0.9, 0.1, "insightface", null));
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(ocrOk("123"));

        EkycVerificationResult result = service.verify(front, back, selfie);

        assertFalse(result.verified());
        assertEquals(ErrorCode.EKYC_FACE_MISMATCH,
                assertThrows(DomainException.class, () -> service.assertVerified(result)).getErrorCode());
    }

    @Test
    void verify_failsOnEmptyOcrId() {
        when(ekycAiPort.liveness(selfie)).thenReturn(liveOk());
        when(ekycAiPort.faceVerify(selfie, front)).thenReturn(faceOk());
        when(ekycAiPort.ocrIdCard(front, back))
                .thenReturn(new EkycOcrResult(false, "A", null, null, null, null, "blur"));

        EkycVerificationResult result = service.verify(front, back, selfie);

        assertFalse(result.verified());
        assertEquals(ErrorCode.EKYC_OCR_FAILED,
                assertThrows(DomainException.class, () -> service.assertVerified(result)).getErrorCode());
    }

    @Test
    void requireIdMatch_rejectsMismatch() {
        when(ekycAiPort.liveness(selfie)).thenReturn(liveOk());
        when(ekycAiPort.faceVerify(selfie, front)).thenReturn(faceOk());
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(ocrOk("079123456789"));

        EkycVerificationResult result = service.verify(front, back, selfie);

        assertEquals(ErrorCode.EKYC_ID_MISMATCH,
                assertThrows(DomainException.class, () -> service.requireIdMatch("000000000", result))
                        .getErrorCode());
    }

    @Test
    void verifyFromUrls_loadsStoredImages() {
        when(storedImageFetcher.fetchBytes("front")).thenReturn(front);
        when(storedImageFetcher.fetchBytes("selfie")).thenReturn(selfie);
        when(storedImageFetcher.fetchBytes("back")).thenReturn(back);
        when(ekycAiPort.liveness(selfie)).thenReturn(liveOk());
        when(ekycAiPort.faceVerify(selfie, front)).thenReturn(faceOk());
        when(ekycAiPort.ocrIdCard(any(), any())).thenReturn(ocrOk("123456789"));

        EkycVerificationResult result = service.verifyFromUrls("front", "back", "selfie");

        assertTrue(result.verified());
    }

    @Test
    void verifyFromUrls_requiresFrontAndSelfie() {
        assertEquals(ErrorCode.EKYC_INVALID_DOCUMENTS,
                assertThrows(DomainException.class, () -> service.verifyFromUrls(null, "back", "selfie"))
                        .getErrorCode());
    }
}
