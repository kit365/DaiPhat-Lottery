package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.OcrTicketScanValidationRuleItem;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleSeverity;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidationRuleModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Loads OCR ticket-scan field validation rules from system_config
 * ({@link SystemConfigEnum#OCR_TICKET_SCAN_VALIDATION_RULES}).
 *
 * <p>Malformed or missing JSON falls back to an empty rule set so a bad settings
 * row cannot take OCR validation offline.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OcrTicketScanValidationRulesConfigService {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final ObjectMapper objectMapper;

    public List<OcrFieldValidationRuleModel> listActiveRules() {
        return listAllRules().stream()
                .filter(OcrFieldValidationRuleModel::isActive)
                .toList();
    }

    public List<OcrFieldValidationRuleModel> listAllRules() {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.OCR_TICKET_SCAN_VALIDATION_RULES.name())
                .map(SystemConfigModel::getConfigValue)
                .map(this::parse)
                .orElseGet(List::of);
    }

    private List<OcrFieldValidationRuleModel> parse(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return List.of();
        }
        try {
            OcrTicketScanValidationRuleItem[] items =
                    objectMapper.readValue(rawValue, OcrTicketScanValidationRuleItem[].class);
            if (items == null || items.length == 0) {
                return List.of();
            }
            List<OcrFieldValidationRuleModel> models = new ArrayList<>(items.length);
            for (int i = 0; i < items.length; i++) {
                OcrTicketScanValidationRuleItem item = items[i];
                if (item == null || item.fieldName() == null || item.ruleType() == null) {
                    continue;
                }
                models.add(OcrFieldValidationRuleModel.builder()
                        .id((long) (i + 1))
                        .templateId(null)
                        .fieldLayoutId(null)
                        .fieldName(item.fieldName())
                        .ruleType(item.ruleType())
                        .ruleConfig(item.ruleConfig() != null ? item.ruleConfig() : Map.of())
                        .severity(item.severity() != null
                                ? item.severity()
                                : OcrValidationRuleSeverity.HARD_FAIL)
                        .active(item.isActive() == null || item.isActive())
                        .sortOrder(item.sortOrder() != null ? item.sortOrder() : i)
                        .build());
            }
            models.sort(Comparator
                    .comparingInt(OcrFieldValidationRuleModel::getSortOrder)
                    .thenComparing(r -> r.getId() != null ? r.getId() : 0L));
            return List.copyOf(models);
        } catch (Exception e) {
            log.warn("OCR_TICKET_SCAN_VALIDATION_RULES is not readable, using empty rules", e);
            return List.of();
        }
    }
}
