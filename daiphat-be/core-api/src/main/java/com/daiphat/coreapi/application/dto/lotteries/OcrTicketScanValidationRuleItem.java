package com.daiphat.coreapi.application.dto.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleSeverity;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

/**
 * One OCR field validation rule stored in {@code OCR_TICKET_SCAN_VALIDATION_RULES} JSON.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record OcrTicketScanValidationRuleItem(
        OcrTemplateFieldName fieldName,
        OcrValidationRuleType ruleType,
        Map<String, Object> ruleConfig,
        OcrValidationRuleSeverity severity,
        @JsonProperty("isActive") Boolean isActive,
        Integer sortOrder
) {
}
