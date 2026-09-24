package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.ocrtemplate.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.OcrFieldValidationRuleRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidationRuleModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.OcrFieldValidationRulePersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.OcrFieldValidationRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OcrFieldValidationRuleRepositoryAdapter implements OcrFieldValidationRuleRepositoryPort {

    private final OcrFieldValidationRuleRepository repository;
    private final OcrFieldValidationRulePersistenceMapper mapper;

    @Override
    public OcrFieldValidationRuleModel save(OcrFieldValidationRuleModel model) {
        return mapper.toDomain(repository.save(mapper.toEntity(model)));
    }

    @Override
    public Optional<OcrFieldValidationRuleModel> findById(Long id) {
        return repository.findByIdAndDeletedAtIsNull(id).map(mapper::toDomain);
    }

    @Override
    public List<OcrFieldValidationRuleModel> findByTemplateId(Long templateId) {
        return repository.findByTemplateIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(templateId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public List<OcrFieldValidationRuleModel> findActiveByTemplateId(Long templateId) {
        return repository
                .findByTemplateIdAndActiveTrueAndDeletedAtIsNullOrderBySortOrderAscIdAsc(templateId)
                .stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public List<OcrFieldValidationRuleModel> findActiveByTemplateIdAndFieldName(
            Long templateId,
            OcrTemplateFieldName fieldName
    ) {
        return repository
                .findByTemplateIdAndFieldNameAndActiveTrueAndDeletedAtIsNullOrderBySortOrderAscIdAsc(
                        templateId, fieldName
                )
                .stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public int hardDeleteByTemplateId(Long templateId) {
        return repository.hardDeleteByTemplateId(templateId);
    }
}
