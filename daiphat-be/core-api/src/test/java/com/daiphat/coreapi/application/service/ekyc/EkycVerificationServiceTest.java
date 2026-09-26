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

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

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

    private static String futureExpiry() {
        return LocalDate.now().plusYears(5).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private static String pastIssue() {
        return LocalDate.now().minusYears(2).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private static EkycOcrResult ocrOk(String id) {
        return new EkycOcrResult(
                true,
                "Nguyen Van A",
                id,
                "01/01/1990",
                "Nam",
                "Việt Nam",
                "Hà Nội",
                "123 Đường ABC, Hà Nội",
                pastIssue(),
                futureExpiry(),
                null
        );
    }

    private static EkycOcrResult ocrMissingGender(String id) {
        return new EkycOcrResult(
                true,
                "Nguyen Van A",
                id,
                "01/01/1990",
                null,
                "Việt Nam",
                "Hà Nội",
                "123 Đường ABC, Hà Nội",
                pastIssue(),
                futureExpiry(),
                null
        );
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
        assertEquals("Nam", result.ocrGender());
        assertEquals("Việt Nam", result.ocrNationality());
    }

    @Test
    void verify_failsOnLiveness() {
        when(ekycAiPort.liveness(selfie)).thenReturn(new EkycLivenessResult(false, 0.01, "laplacian", null));
        when(ekycAiPort.faceVerify(selfie, front)).thenReturn(faceOk());
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(ocrOk("079123456789"));

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
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(ocrOk("079123456789"));

        EkycVerificationResult result = service.verify(front, back, selfie);

        assertFalse(result.verified());
        assertEquals(ErrorCode.EKYC_FACE_MISMATCH,
                assertThrows(DomainException.class, () -> service.assertVerified(result)).getErrorCode());
    }

    @Test
    void verify_failsWhenAnyOcrFieldMissing() {
        when(ekycAiPort.liveness(selfie)).thenReturn(liveOk());
        when(ekycAiPort.faceVerify(selfie, front)).thenReturn(faceOk());
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(ocrMissingGender("079123456789"));

        EkycVerificationResult result = service.verify(front, back, selfie);

        assertFalse(result.verified());
        assertTrue(result.failureReason().contains("Giới tính"));
        assertEquals(List.of("gender"), result.missingFields());
        assertEquals(ErrorCode.EKYC_OCR_FAILED,
                assertThrows(DomainException.class, () -> service.assertVerified(result)).getErrorCode());
    }

    @Test
    @SuppressWarnings("unchecked")
    void assertVerified_reportsSideToRetakeForEachMissingField() {
        EkycOcrResult ocr = new EkycOcrResult(
                true, "Nguyen Van A", "079123456789", "01/01/1990", null, "Việt Nam", "Hà Nội",
                null, null, futureExpiry(), null,
                Map.of("gender", "front", "place_of_residence", "front", "issue_date", "back"));
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(ocr);

        EkycVerificationResult result = service.verifyIdCardOcrOnly(front, back);

        assertEquals(List.of("gender", "place_of_residence", "issue_date"), result.missingFields());
        assertTrue(result.failureReason().contains("Mặt trước: Giới tính, Nơi thường trú"));
        assertTrue(result.failureReason().contains("Mặt sau: Ngày cấp"));

        DomainException ex = assertThrows(DomainException.class, () -> service.assertVerified(result));
        Map<String, Object> data = (Map<String, Object>) ex.getData();
        assertEquals(List.of("front", "back"), data.get("retakeSides"));
        assertEquals(
                Map.of("gender", "front", "place_of_residence", "front", "issue_date", "back"),
                data.get("missingFieldSides"));
        assertEquals(List.of("Giới tính", "Nơi thường trú", "Ngày cấp"), data.get("missingFieldLabels"));
    }

    @Test
    void failedResult_defaultsIssueDateToBackWhenSidesUnknown() {
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(new EkycOcrResult(
                true, "Nguyen Van A", "079123456789", "01/01/1990", "Nam", "Việt Nam", "Hà Nội",
                "123 Đường ABC", null, null, null));

        EkycVerificationResult result = service.verifyIdCardOcrOnly(front, back);

        assertEquals(Map.of("issue_date", "back", "expiry_date", "front"), result.missingFieldSides());
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
    void requireOcrIdNumber_rejectsMissingOrShortId() {
        EkycVerificationResult empty = new EkycVerificationResult(
                EkycStatus.FAILED, null, null, null, null, null, null, null, null, null,
                null, null, null, "OCR failed");
        assertEquals(ErrorCode.EKYC_OCR_FAILED,
                assertThrows(DomainException.class, () -> service.requireOcrIdNumber(empty)).getErrorCode());

        EkycVerificationResult shortId = new EkycVerificationResult(
                EkycStatus.VERIFIED, "A", "123", null, null, null, null, null, null, null,
                null, null, null, null);
        assertEquals(ErrorCode.EKYC_OCR_FAILED,
                assertThrows(DomainException.class, () -> service.requireOcrIdNumber(shortId)).getErrorCode());
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
    void verifyFromUrls_requiresFrontBackAndSelfie() {
        assertEquals(ErrorCode.EKYC_INVALID_DOCUMENTS,
                assertThrows(DomainException.class, () -> service.verifyFromUrls(null, "back", "selfie"))
                        .getErrorCode());
        assertEquals(ErrorCode.EKYC_INVALID_DOCUMENTS,
                assertThrows(DomainException.class, () -> service.verifyFromUrls("front", null, "selfie"))
                        .getErrorCode());
    }

    @Test
    void verifyIdCardOcrOnly_success_withoutSelfieFaceOrLiveness() {
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(ocrOk("079123456789"));

        EkycVerificationResult result = service.verifyIdCardOcrOnly(front, back);

        assertTrue(result.verified());
        assertEquals("079123456789", result.ocrIdNumber());
        assertEquals("Nguyen Van A", result.ocrName());
        assertEquals(pastIssue(), result.ocrIssueDate());
    }

    @Test
    void verifyIdCardOcrOnly_failsWhenAnyRequiredFieldMissing() {
        when(ekycAiPort.ocrIdCard(front, back)).thenReturn(ocrMissingGender("079123456789"));

        EkycVerificationResult result = service.verifyIdCardOcrOnly(front, back);

        assertFalse(result.verified());
        assertEquals(EkycStatus.FAILED, result.status());
        assertTrue(result.failureReason().contains("Giới tính"));
    }

    @Test
    void verifyIdCardOcrOnlyFromUrls_requiresFrontAndBack() {
        assertEquals(ErrorCode.EKYC_INVALID_DOCUMENTS,
                assertThrows(DomainException.class, () -> service.verifyIdCardOcrOnlyFromUrls("front", null))
                        .getErrorCode());
    }
}
