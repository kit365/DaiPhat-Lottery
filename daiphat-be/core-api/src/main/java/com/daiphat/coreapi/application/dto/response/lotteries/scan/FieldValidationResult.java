package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldValidationStatus;

/**
 * System-validation result for one OCR field (station, numbers, price, …).
 */
public record FieldValidationResult(
        OcrFieldValidationStatus status,
        String message,
        String expectedValue
) {
    public static FieldValidationResult of(
            OcrFieldValidationStatus status,
            String message,
            String expectedValue
    ) {
        return new FieldValidationResult(status, message, expectedValue);
    }

    public static FieldValidationResult matched(String expectedValue) {
        return of(OcrFieldValidationStatus.MATCHED, null, expectedValue);
    }

    public static FieldValidationResult mismatched(String message, String expectedValue) {
        return of(OcrFieldValidationStatus.MISMATCHED, message, expectedValue);
    }

    public static FieldValidationResult notFound(String message) {
        return of(OcrFieldValidationStatus.NOT_FOUND, message, null);
    }

    public static FieldValidationResult uncertain(String message) {
        return of(OcrFieldValidationStatus.UNCERTAIN, message, null);
    }

    public static FieldValidationResult unreadable(String message) {
        return of(OcrFieldValidationStatus.UNREADABLE, message, null);
    }
}
