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

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Shared eKYC orchestration.
 * <ul>
 *   <li>{@link #verify} / {@link #verifyFromUrls} — Street Agent full flow (selfie + liveness + face + OCR)</li>
 *   <li>{@link #verifyIdCardOcrOnly} / {@link #verifyIdCardOcrOnlyFromUrls} — Prize payout: CCCD OCR only</li>
 * </ul>
 * OCR pass requires all nine CCCD identity fields (2A). Returns a result for persistence;
 * use {@link #assertVerified} to map failures to domain errors.
 */
@Service
@RequiredArgsConstructor
public class EkycVerificationService {

    private static final Pattern ID_9_OR_12 = Pattern.compile("^(\\d{9}|\\d{12})$");
    private static final String SIDE_FRONT = "front";
    private static final String SIDE_BACK = "back";
    private static final DateTimeFormatter[] DATE_FORMATS = {
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy")
    };
    private static final Pattern NO_EXPIRY = Pattern.compile(
            "(?i)kh[oô]ng\\s*th[ơời]\\s*h[ạa]n"
    );

    private final EkycAiPort ekycAiPort;
    private final StoredImageFetcher storedImageFetcher;

    @Value("${daiphat.ekyc-ai.face-distance-threshold:0.55}")
    private double faceDistanceThreshold;

    @Value("${daiphat.ekyc-ai.liveness-min-score:0.08}")
    private double livenessMinScore;

    /** Full eKYC (Street Agent): requires front + back + selfie. */
    public EkycVerificationResult verifyFromUrls(String frontUrl, String backUrl, String selfieUrl) {
        if (!StringUtils.hasText(frontUrl)
                || !StringUtils.hasText(backUrl)
                || !StringUtils.hasText(selfieUrl)) {
            throw new DomainException(ErrorCode.EKYC_INVALID_DOCUMENTS);
        }
        byte[] front = storedImageFetcher.fetchBytes(frontUrl);
        byte[] back = storedImageFetcher.fetchBytes(backUrl);
        byte[] selfie = storedImageFetcher.fetchBytes(selfieUrl);
        return verify(front, back, selfie);
    }

    /** Prize-payout eKYC: CCCD front + back OCR only (no selfie / face / liveness). */
    public EkycVerificationResult verifyIdCardOcrOnlyFromUrls(String frontUrl, String backUrl) {
        if (!StringUtils.hasText(frontUrl) || !StringUtils.hasText(backUrl)) {
            throw new DomainException(ErrorCode.EKYC_INVALID_DOCUMENTS);
        }
        byte[] front = storedImageFetcher.fetchBytes(frontUrl);
        byte[] back = storedImageFetcher.fetchBytes(backUrl);
        return verifyIdCardOcrOnly(front, back);
    }

    public EkycVerificationResult verify(byte[] frontBytes, byte[] backBytes, byte[] selfieBytes) {
        if (frontBytes == null || frontBytes.length == 0
                || backBytes == null || backBytes.length == 0
                || selfieBytes == null || selfieBytes.length == 0) {
            throw new DomainException(ErrorCode.EKYC_INVALID_DOCUMENTS);
        }

        EkycLivenessResult live = ekycAiPort.liveness(selfieBytes);
        EkycFaceVerifyResult face = ekycAiPort.faceVerify(selfieBytes, frontBytes);
        EkycOcrResult ocr = ekycAiPort.ocrIdCard(frontBytes, backBytes);

        boolean livenessPass = live.live() && live.score() >= livenessMinScore;
        boolean facePass = face.verified() && face.distance() <= faceDistanceThreshold;
        List<String> ocrIssues = validateOcrFields(ocr);

        if (!livenessPass) {
            return failed(ocr, face.distance(), live.score(), "Liveness failed");
        }
        if (!facePass) {
            return failed(ocr, face.distance(), live.score(), "Face mismatch");
        }
        if (!ocrIssues.isEmpty()) {
            return failed(
                    ocr,
                    face.distance(),
                    live.score(),
                    describeOcrIssues(ocrIssues, fieldSides(ocr, ocrIssues)),
                    ocrIssues
            );
        }

        return success(ocr, face.distance(), live.score(), Math.max(0, Math.min(1, 1.0 - face.distance())));
    }

    /** CCCD OCR-only verification used by prize payout (front + back required). */
    public EkycVerificationResult verifyIdCardOcrOnly(byte[] frontBytes, byte[] backBytes) {
        if (frontBytes == null || frontBytes.length == 0 || backBytes == null || backBytes.length == 0) {
            throw new DomainException(ErrorCode.EKYC_INVALID_DOCUMENTS);
        }

        EkycOcrResult ocr = ekycAiPort.ocrIdCard(frontBytes, backBytes);
        List<String> ocrIssues = validateOcrFields(ocr);
        if (!ocrIssues.isEmpty()) {
            return failed(
                    ocr,
                    null,
                    null,
                    StringUtils.hasText(ocr.error())
                            ? ocr.error() + "; " + describeOcrIssues(ocrIssues, fieldSides(ocr, ocrIssues))
                            : describeOcrIssues(ocrIssues, fieldSides(ocr, ocrIssues)),
                    ocrIssues
            );
        }

        return success(ocr, null, null, null);
    }

    public void assertVerified(EkycVerificationResult result) {
        if (result == null || result.verified()) {
            return;
        }
        String reason = result.failureReason() == null ? "" : result.failureReason().toLowerCase(Locale.ROOT);
        if (reason.contains("liveness")) {
            throw new DomainException(ErrorCode.EKYC_LIVENESS_FAILED);
        }
        if (reason.contains("face")) {
            throw new DomainException(ErrorCode.EKYC_FACE_MISMATCH);
        }
        List<String> missingFields = result.missingFields();
        Map<String, Object> errorData = new HashMap<>();
        if (!missingFields.isEmpty()) {
            Map<String, String> sides = new LinkedHashMap<>();
            missingFields.forEach(field ->
                    sides.put(field, result.missingFieldSides().getOrDefault(field, defaultFieldSide(field))));
            errorData.put("missingFields", missingFields);
            errorData.put("missingFieldLabels", toFieldLabels(missingFields));
            errorData.put("missingFieldSides", sides);
            errorData.put("retakeSides", retakeSides(sides));
        }
        if (result.failureReason() != null) {
            errorData.put("failureReason", result.failureReason());
        }
        throw DomainException.withInternalMessage(ErrorCode.EKYC_OCR_FAILED, errorData, result.failureReason());
    }

    public void requireIdMatch(String expectedIdNumber, EkycVerificationResult result) {
        String expected = digitsOnly(expectedIdNumber);
        String actual = digitsOnly(result != null ? result.ocrIdNumber() : null);
        if (!StringUtils.hasText(expected) || !expected.equals(actual)) {
            throw new DomainException(ErrorCode.EKYC_ID_MISMATCH);
        }
    }

    /**
     * Prize-payout / Street Agent CCCD source of truth: OCR digits must be present and 9 or 12 long.
     */
    public String requireOcrIdNumber(EkycVerificationResult result) {
        String id = digitsOnly(result != null ? result.ocrIdNumber() : null);
        if (!StringUtils.hasText(id) || !ID_9_OR_12.matcher(id).matches()) {
            Map<String, Object> errorData = Map.of(
                    "missingFields", List.of("personal_identification_number"),
                    "missingFieldLabels", List.of("Số CCCD"),
                    "missingFieldSides", Map.of("personal_identification_number", SIDE_FRONT),
                    "retakeSides", List.of(SIDE_FRONT),
                    "failureReason", "Không đọc được số CCCD từ ảnh. Vui lòng tải lại ảnh rõ hơn."
            );
            throw DomainException.withInternalMessage(
                    ErrorCode.EKYC_OCR_FAILED,
                    errorData,
                    "Không đọc được số CCCD từ ảnh. Vui lòng tải lại ảnh rõ hơn.");
        }
        return id;
    }

    /**
     * Validates all nine CCCD identity fields. Returns field keys that are missing or invalid.
     */
    List<String> validateOcrFields(EkycOcrResult ocr) {
        List<String> issues = new ArrayList<>();
        if (ocr == null || !ocr.valid()) {
            issues.add("personal_identification_number");
            issues.add("full_name");
            issues.add("date_of_birth");
            issues.add("gender");
            issues.add("nationality");
            issues.add("place_of_birth_registration");
            issues.add("place_of_residence");
            issues.add("issue_date");
            issues.add("expiry_date");
            return issues;
        }

        String id = digitsOnly(ocr.idNumber());
        if (!StringUtils.hasText(id) || !ID_9_OR_12.matcher(id).matches()) {
            issues.add("personal_identification_number");
        }

        if (!StringUtils.hasText(ocr.name()) || ocr.name().trim().length() < 2) {
            issues.add("full_name");
        }

        LocalDate dob = parseDate(ocr.dob());
        if (dob == null || dob.isAfter(LocalDate.now())) {
            issues.add("date_of_birth");
        }

        if (!isValidGender(ocr.gender())) {
            issues.add("gender");
        }

        if (!StringUtils.hasText(ocr.nationality())) {
            issues.add("nationality");
        }

        if (!StringUtils.hasText(ocr.placeOfBirthRegistration())) {
            issues.add("place_of_birth_registration");
        }

        if (!StringUtils.hasText(ocr.placeOfResidence())) {
            issues.add("place_of_residence");
        }

        LocalDate issue = parseDate(ocr.issueDate());
        if (issue == null || issue.isAfter(LocalDate.now())) {
            issues.add("issue_date");
        }

        if (!isValidExpiry(ocr.expiryDate())) {
            issues.add("expiry_date");
        }

        return issues;
    }

    private static boolean isValidGender(String gender) {
        if (!StringUtils.hasText(gender)) {
            return false;
        }
        String g = gender.trim().toLowerCase(Locale.ROOT);
        String folded = java.text.Normalizer.normalize(g, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return folded.equals("nam")
                || folded.equals("nu")
                || folded.equals("male")
                || folded.equals("female");
    }

    private static boolean isValidExpiry(String expiry) {
        if (!StringUtils.hasText(expiry)) {
            return false;
        }
        if (NO_EXPIRY.matcher(expiry.trim()).find()) {
            return true;
        }
        LocalDate date = parseDate(expiry);
        return date != null && !date.isBefore(LocalDate.now());
    }

    private static LocalDate parseDate(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String v = value.trim();
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try {
                return LocalDate.parse(v, fmt);
            } catch (DateTimeParseException ignored) {
                // try next
            }
        }
        // Also try extracting a date substring
        var m = Pattern.compile("(\\d{2}[/\\-]\\d{2}[/\\-]\\d{4})").matcher(v);
        if (m.find()) {
            return parseDate(m.group(1));
        }
        return null;
    }

    private static EkycVerificationResult success(
            EkycOcrResult ocr,
            Double faceDistance,
            Double livenessScore,
            Double faceMatchingScore
    ) {
        return new EkycVerificationResult(
                EkycStatus.VERIFIED,
                ocr.name(),
                digitsOnly(ocr.idNumber()),
                ocr.dob(),
                ocr.gender(),
                ocr.nationality(),
                ocr.placeOfBirthRegistration(),
                ocr.placeOfResidence(),
                ocr.issueDate(),
                ocr.expiryDate(),
                faceDistance,
                livenessScore,
                faceMatchingScore,
                null
        );
    }

    private static EkycVerificationResult failed(
            EkycOcrResult ocr,
            Double faceDistance,
            Double livenessScore,
            String reason
    ) {
        return failed(ocr, faceDistance, livenessScore, reason, List.of());
    }

    private static EkycVerificationResult failed(
            EkycOcrResult ocr,
            Double faceDistance,
            Double livenessScore,
            String reason,
            List<String> missingFields
    ) {
        return new EkycVerificationResult(
                EkycStatus.FAILED,
                ocr != null ? ocr.name() : null,
                ocr != null ? digitsOnly(ocr.idNumber()) : null,
                ocr != null ? ocr.dob() : null,
                ocr != null ? ocr.gender() : null,
                ocr != null ? ocr.nationality() : null,
                ocr != null ? ocr.placeOfBirthRegistration() : null,
                ocr != null ? ocr.placeOfResidence() : null,
                ocr != null ? ocr.issueDate() : null,
                ocr != null ? ocr.expiryDate() : null,
                faceDistance,
                livenessScore,
                null,
                reason,
                missingFields,
                fieldSides(ocr, missingFields)
        );
    }

    /** Side to retake for each field: from ekyc-vision when known, else the CCCD 2016/2021 layout. */
    static Map<String, String> fieldSides(EkycOcrResult ocr, List<String> fieldKeys) {
        Map<String, String> sides = new LinkedHashMap<>();
        if (fieldKeys == null) {
            return sides;
        }
        Map<String, String> reported = ocr != null ? ocr.fieldSides() : Map.of();
        for (String key : fieldKeys) {
            sides.put(key, reported.getOrDefault(key, defaultFieldSide(key)));
        }
        return sides;
    }

    static String defaultFieldSide(String fieldKey) {
        return "issue_date".equals(fieldKey) ? SIDE_BACK : SIDE_FRONT;
    }

    static List<String> retakeSides(Map<String, String> sides) {
        return Stream.of(SIDE_FRONT, SIDE_BACK).filter(sides::containsValue).toList();
    }

    /** Human-readable failure reason grouped by CCCD side, e.g. "Mặt trước: Giới tính; Mặt sau: Ngày cấp". */
    static String describeOcrIssues(List<String> fieldKeys, Map<String, String> sides) {
        List<String> groups = new ArrayList<>();
        for (String side : List.of(SIDE_FRONT, SIDE_BACK)) {
            List<String> labels = fieldKeys.stream()
                    .filter(key -> side.equals(sides.getOrDefault(key, defaultFieldSide(key))))
                    .map(EkycVerificationService::toFieldLabel)
                    .toList();
            if (!labels.isEmpty()) {
                groups.add((SIDE_FRONT.equals(side) ? "Mặt trước: " : "Mặt sau: ") + String.join(", ", labels));
            }
        }
        return "Thiếu/không hợp lệ — " + String.join("; ", groups)
                + ". Vui lòng chụp lại mặt CCCD tương ứng.";
    }

    public static List<String> toFieldLabels(List<String> fieldKeys) {
        if (fieldKeys == null) {
            return List.of();
        }
        return fieldKeys.stream()
                .map(EkycVerificationService::toFieldLabel)
                .toList();
    }

    public static String toFieldLabel(String fieldKey) {
        if (fieldKey == null) {
            return "";
        }
        return switch (fieldKey) {
            case "personal_identification_number" -> "Số CCCD";
            case "full_name" -> "Họ và tên";
            case "date_of_birth" -> "Ngày sinh";
            case "gender" -> "Giới tính";
            case "nationality" -> "Quốc tịch";
            case "place_of_birth_registration" -> "Nơi sinh / Quê quán";
            case "place_of_residence" -> "Nơi thường trú";
            case "issue_date" -> "Ngày cấp";
            case "expiry_date" -> "Ngày hết hạn";
            default -> fieldKey;
        };
    }

    public static String digitsOnly(String value) {
        if (value == null) {
            return null;
        }
        String digits = value.replaceAll("\\D+", "");
        return digits.isBlank() ? null : digits;
    }
}
