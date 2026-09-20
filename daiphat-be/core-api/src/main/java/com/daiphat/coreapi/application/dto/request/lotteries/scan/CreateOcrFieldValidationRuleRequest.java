package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleSeverity;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleType;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record CreateOcrFieldValidationRuleRequest(
        @NotNull OcrTemplateFieldName fieldName,
        @NotNull OcrValidationRuleType ruleType,
        Map<String, Object> ruleConfig,
        OcrValidationRuleSeverity severity,
        Long fieldLayoutId,
        Boolean isActive,
        Integer sortOrder
) {
}
