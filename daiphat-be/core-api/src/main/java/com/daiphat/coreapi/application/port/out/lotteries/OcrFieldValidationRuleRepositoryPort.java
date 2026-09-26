package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidationRuleModel;

import java.util.List;
import java.util.Optional;

public interface OcrFieldValidationRuleRepositoryPort {

    OcrFieldValidationRuleModel save(OcrFieldValidationRuleModel model);

    Optional<OcrFieldValidationRuleModel> findById(Long id);

    List<OcrFieldValidationRuleModel> findByTemplateId(Long templateId);

    List<OcrFieldValidationRuleModel> findActiveByTemplateId(Long templateId);

    List<OcrFieldValidationRuleModel> findActiveByTemplateIdAndFieldName(
            Long templateId,
            OcrTemplateFieldName fieldName
    );

    /** Physically removes all validation rules for a template (including soft-deleted rows). */
    int hardDeleteByTemplateId(Long templateId);
}
