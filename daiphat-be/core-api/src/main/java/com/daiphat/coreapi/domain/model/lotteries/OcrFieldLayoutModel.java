package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldDataType;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OcrFieldLayoutModel {

    private Long id;
    private Long templateId;
    private OcrTemplateFieldName fieldName;
    private OcrNormalizedBoundingBox boundingBox;
    private OcrFieldDataType dataType;
    private boolean required;
    /** Lower number = try first during OCR (1 = primary). */
    private int priority;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;
}
