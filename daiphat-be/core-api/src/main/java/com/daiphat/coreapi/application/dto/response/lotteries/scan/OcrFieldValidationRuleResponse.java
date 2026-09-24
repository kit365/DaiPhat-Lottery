package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleSeverity;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleType;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.Map;

@Builder
public record OcrFieldValidationRuleResponse(
        Long id,
        Long templateId,
        Long fieldLayoutId,
        OcrTemplateFieldName fieldName,
        OcrValidationRuleType ruleType,
        Map<String, Object> ruleConfig,
        OcrValidationRuleSeverity severity,
        boolean isActive,
        int sortOrder,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
