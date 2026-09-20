package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateOcrFieldValidationRuleRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.UpdateOcrFieldValidationRuleRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrFieldValidationRuleResponse;
import com.daiphat.coreapi.application.port.out.lotteries.OcrFieldLayoutRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrFieldValidationRuleRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrTicketTemplateRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleSeverity;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrValidationRuleType;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidationRuleModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrTicketTemplateModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OcrFieldValidationRuleService {

    private final OcrFieldValidationRuleRepositoryPort ruleRepositoryPort;
    private final OcrTicketTemplateRepositoryPort templateRepositoryPort;
    private final OcrFieldLayoutRepositoryPort fieldLayoutRepositoryPort;

    @Transactional(readOnly = true)
    public List<OcrFieldValidationRuleResponse> listByTemplate(Long templateId) {
        requireTemplate(templateId);
        return ruleRepositoryPort.findByTemplateId(templateId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OcrFieldValidationRuleResponse create(Long templateId, CreateOcrFieldValidationRuleRequest request) {
        requireTemplate(templateId);
        validateConfig(request.ruleType(), request.ruleConfig());
        if (request.fieldLayoutId() != null) {
            requireLayoutBelongsToTemplate(templateId, request.fieldLayoutId());
        }

        OcrFieldValidationRuleModel saved = ruleRepositoryPort.save(
                OcrFieldValidationRuleModel.builder()
                        .templateId(templateId)
                        .fieldLayoutId(request.fieldLayoutId())
                        .fieldName(request.fieldName())
                        .ruleType(request.ruleType())
                        .ruleConfig(copyConfig(request.ruleConfig()))
                        .severity(request.severity() != null
                                ? request.severity()
                                : OcrValidationRuleSeverity.HARD_FAIL)
                        .active(request.isActive() == null || Boolean.TRUE.equals(request.isActive()))
                        .sortOrder(request.sortOrder() != null ? request.sortOrder() : 0)
                        .build()
        );
        return toResponse(saved);
    }

    @Transactional
    public OcrFieldValidationRuleResponse update(
            Long templateId,
            Long ruleId,
            UpdateOcrFieldValidationRuleRequest request
    ) {
        requireTemplate(templateId);
        OcrFieldValidationRuleModel existing = ruleRepositoryPort.findById(ruleId)
                .filter(r -> templateId.equals(r.getTemplateId()))
                .orElseThrow(() -> new DomainException(ErrorCode.OCR_FIELD_VALIDATION_RULE_NOT_FOUND));

        OcrValidationRuleType ruleType =
                request.ruleType() != null ? request.ruleType() : existing.getRuleType();
        Map<String, Object> config =
                request.ruleConfig() != null ? request.ruleConfig() : existing.getRuleConfig();
        validateConfig(ruleType, config);

        if (request.fieldLayoutId() != null) {
            requireLayoutBelongsToTemplate(templateId, request.fieldLayoutId());
            existing.setFieldLayoutId(request.fieldLayoutId());
        }
        if (request.fieldName() != null) {
            existing.setFieldName(request.fieldName());
        }
        existing.setRuleType(ruleType);
        existing.setRuleConfig(copyConfig(config));
        if (request.severity() != null) {
            existing.setSeverity(request.severity());
        }
        if (request.isActive() != null) {
            existing.setActive(request.isActive());
        }
        if (request.sortOrder() != null) {
            existing.setSortOrder(request.sortOrder());
        }
        return toResponse(ruleRepositoryPort.save(existing));
    }

    @Transactional
    public void softDelete(Long templateId, Long ruleId) {
        requireTemplate(templateId);
        OcrFieldValidationRuleModel existing = ruleRepositoryPort.findById(ruleId)
                .filter(r -> templateId.equals(r.getTemplateId()))
                .orElseThrow(() -> new DomainException(ErrorCode.OCR_FIELD_VALIDATION_RULE_NOT_FOUND));
        existing.setDeletedAt(LocalDateTime.now());
        existing.setActive(false);
        ruleRepositoryPort.save(existing);
    }

    private void requireTemplate(Long templateId) {
        OcrTicketTemplateModel template = templateRepositoryPort.findById(templateId)
                .orElseThrow(() -> new DomainException(ErrorCode.OCR_TICKET_TEMPLATE_NOT_FOUND));
        if (template.getDeletedAt() != null) {
            throw new DomainException(ErrorCode.OCR_TICKET_TEMPLATE_NOT_FOUND);
        }
    }

    private void requireLayoutBelongsToTemplate(Long templateId, Long layoutId) {
        fieldLayoutRepositoryPort.findById(layoutId)
                .filter(layout -> templateId.equals(layout.getTemplateId()))
                .orElseThrow(() -> new DomainException(ErrorCode.OCR_FIELD_LAYOUT_NOT_FOUND));
    }

    private void validateConfig(OcrValidationRuleType ruleType, Map<String, Object> ruleConfig) {
        if (ruleType == null) {
            throw new DomainException(ErrorCode.OCR_FIELD_VALIDATION_RULE_INVALID, "Thiếu ruleType.");
        }
        Map<String, Object> config = ruleConfig != null ? ruleConfig : Map.of();
        switch (ruleType) {
            case REGEX -> {
                Object pattern = config.get("pattern");
                if (!(pattern instanceof String s) || !StringUtils.hasText(s)) {
                    throw new DomainException(
                            ErrorCode.OCR_FIELD_VALIDATION_RULE_INVALID,
                            "REGEX yêu cầu ruleConfig.pattern (chuỗi)."
                    );
                }
            }
            case VALUE_LIST -> {
                Object allowed = config.get("allowedValues");
                if (!(allowed instanceof List<?> list) || list.isEmpty()) {
                    throw new DomainException(
                            ErrorCode.OCR_FIELD_VALIDATION_RULE_INVALID,
                            "VALUE_LIST yêu cầu ruleConfig.allowedValues (mảng không rỗng)."
                    );
                }
            }
            case DATE_RANGE, NUMBER_RANGE -> {
                // offsets / min-max optional with defaults in evaluator
            }
            case REFERENCE_LOOKUP -> {
                Object lookup = config.get("lookup");
                if (!(lookup instanceof String s) || !StringUtils.hasText(s)) {
                    throw new DomainException(
                            ErrorCode.OCR_FIELD_VALIDATION_RULE_INVALID,
                            "REFERENCE_LOOKUP yêu cầu ruleConfig.lookup (ví dụ draw_schedule)."
                    );
                }
            }
        }
    }

    private static Map<String, Object> copyConfig(Map<String, Object> config) {
        return config == null ? new HashMap<>() : new HashMap<>(config);
    }

    private OcrFieldValidationRuleResponse toResponse(OcrFieldValidationRuleModel model) {
        return OcrFieldValidationRuleResponse.builder()
                .id(model.getId())
                .templateId(model.getTemplateId())
                .fieldLayoutId(model.getFieldLayoutId())
                .fieldName(model.getFieldName())
                .ruleType(model.getRuleType())
                .ruleConfig(model.getRuleConfig())
                .severity(model.getSeverity())
                .isActive(model.isActive())
                .sortOrder(model.getSortOrder())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }
}
