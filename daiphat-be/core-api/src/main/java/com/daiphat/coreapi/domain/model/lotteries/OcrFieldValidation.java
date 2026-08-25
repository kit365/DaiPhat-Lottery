package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldValidationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Per-field system validation snapshot persisted as JSONB on ocr_scan_results.
 * Plain class for Hibernate JSON mapping (avoid application DTO records on entities).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OcrFieldValidation {

    private OcrFieldValidationStatus status;
    private String message;
    private String expectedValue;
}
