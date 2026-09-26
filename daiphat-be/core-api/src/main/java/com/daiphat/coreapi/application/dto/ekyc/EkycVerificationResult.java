package com.daiphat.coreapi.application.dto.ekyc;

import com.daiphat.coreapi.domain.model.enums.ekyc.EkycStatus;

import java.util.List;
import java.util.Map;

public record EkycVerificationResult(
        EkycStatus status,
        String ocrName,
        String ocrIdNumber,
        String ocrDob,
        String ocrGender,
        String ocrNationality,
        String ocrPlaceOfBirthRegistration,
        String ocrPlaceOfResidence,
        String ocrIssueDate,
        String ocrExpiryDate,
        Double faceDistance,
        Double livenessScore,
        Double faceMatchingScore,
        String failureReason,
        List<String> missingFields,
        /* Missing field key -> CCCD side ("front"/"back") the user should retake. */
        Map<String, String> missingFieldSides
) {
    public EkycVerificationResult {
        missingFields = missingFields == null ? List.of() : List.copyOf(missingFields);
        missingFieldSides = missingFieldSides == null ? Map.of() : Map.copyOf(missingFieldSides);
    }

    public EkycVerificationResult(
            EkycStatus status,
            String ocrName,
            String ocrIdNumber,
            String ocrDob,
            String ocrGender,
            String ocrNationality,
            String ocrPlaceOfBirthRegistration,
            String ocrPlaceOfResidence,
            String ocrIssueDate,
            String ocrExpiryDate,
            Double faceDistance,
            Double livenessScore,
            Double faceMatchingScore,
            String failureReason,
            List<String> missingFields
    ) {
        this(
                status,
                ocrName,
                ocrIdNumber,
                ocrDob,
                ocrGender,
                ocrNationality,
                ocrPlaceOfBirthRegistration,
                ocrPlaceOfResidence,
                ocrIssueDate,
                ocrExpiryDate,
                faceDistance,
                livenessScore,
                faceMatchingScore,
                failureReason,
                missingFields,
                Map.of()
        );
    }

    public EkycVerificationResult(
            EkycStatus status,
            String ocrName,
            String ocrIdNumber,
            String ocrDob,
            String ocrGender,
            String ocrNationality,
            String ocrPlaceOfBirthRegistration,
            String ocrPlaceOfResidence,
            String ocrIssueDate,
            String ocrExpiryDate,
            Double faceDistance,
            Double livenessScore,
            Double faceMatchingScore,
            String failureReason
    ) {
        this(
                status,
                ocrName,
                ocrIdNumber,
                ocrDob,
                ocrGender,
                ocrNationality,
                ocrPlaceOfBirthRegistration,
                ocrPlaceOfResidence,
                ocrIssueDate,
                ocrExpiryDate,
                faceDistance,
                livenessScore,
                faceMatchingScore,
                failureReason,
                List.of(),
                Map.of()
        );
    }

    public boolean verified() {
        return status == EkycStatus.VERIFIED;
    }

    /** Legacy alias. */
    public String ocrAddress() {
        return ocrPlaceOfResidence;
    }
}
