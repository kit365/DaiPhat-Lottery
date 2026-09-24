package com.daiphat.coreapi.application.dto.ekyc;

import com.daiphat.coreapi.domain.model.enums.ekyc.EkycStatus;

public record EkycVerificationResult(
        EkycStatus status,
        String ocrName,
        String ocrIdNumber,
        String ocrDob,
        String ocrAddress,
        Double faceDistance,
        Double livenessScore,
        Double faceMatchingScore,
        String failureReason
) {
    public boolean verified() {
        return status == EkycStatus.VERIFIED;
    }
}
