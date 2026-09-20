package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleSeverity;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OcrFieldValidationRuleModel {

    private Long id;
    private Long templateId;
    private Long fieldLayoutId;
    private OcrTemplateFieldName fieldName;
    private OcrValidationRuleType ruleType;
    private Map<String, Object> ruleConfig;
    private OcrValidationRuleSeverity severity;
    private boolean active;
    private int sortOrder;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;
}
