package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleSeverity;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

/**
 * One configurable-rule failure recorded on an OCR scan field (JSONB).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OcrFieldValidationFailure {

    private Long ruleId;
    private OcrValidationRuleType ruleType;
    private OcrValidationRuleSeverity severity;
    private String message;
    private Map<String, Object> configSnapshot;
}
