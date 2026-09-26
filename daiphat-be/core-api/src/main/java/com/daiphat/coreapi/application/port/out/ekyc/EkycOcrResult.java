package com.daiphat.coreapi.application.port.out.ekyc;

import java.util.Map;

/**
 * Raw OCR fields from ekyc-vision (merged front/back). Values are as extracted — never fabricated.
 * {@code fieldSides} maps each field key to the CCCD side ("front"/"back") it was read from, or the side
 * that should be retaken when the field is missing.
 */
public record EkycOcrResult(
        boolean valid,
        String name,
        String idNumber,
        String dob,
        String gender,
        String nationality,
        String placeOfBirthRegistration,
        String placeOfResidence,
        String issueDate,
        String expiryDate,
        String error,
        Map<String, String> fieldSides
) {
    public EkycOcrResult {
        fieldSides = fieldSides == null ? Map.of() : Map.copyOf(fieldSides);
    }

    public EkycOcrResult(
            boolean valid,
            String name,
            String idNumber,
            String dob,
            String gender,
            String nationality,
            String placeOfBirthRegistration,
            String placeOfResidence,
            String issueDate,
            String expiryDate,
            String error
    ) {
        this(valid, name, idNumber, dob, gender, nationality, placeOfBirthRegistration,
                placeOfResidence, issueDate, expiryDate, error, Map.of());
    }

    /** Legacy alias for place of residence. */
    public String address() {
        return placeOfResidence;
    }
}
