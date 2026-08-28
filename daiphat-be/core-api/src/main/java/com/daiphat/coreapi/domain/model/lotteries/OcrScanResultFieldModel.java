package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OcrScanResultFieldModel {

    private Long id;
    private Long ocrScanResultId;
    private OcrTemplateFieldName fieldName;

    private String aiValue;
    private Double aiConfidence;
    private OcrBoundingBox detectedBoundingBox;

    private String correctedValue;
    private boolean corrected;
    private UUID correctedBy;
    private LocalDateTime correctedAt;

    private OcrFieldValidationStatus validationStatus;
    private String validationMessage;
    private String expectedValue;

    /** Which ocr_field_layouts row produced the recognized ai_value (nullable). */
    private Long fieldLayoutId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public String effectiveValue() {
        if (corrected && correctedValue != null) {
            return correctedValue;
        }
        return aiValue;
    }
}
