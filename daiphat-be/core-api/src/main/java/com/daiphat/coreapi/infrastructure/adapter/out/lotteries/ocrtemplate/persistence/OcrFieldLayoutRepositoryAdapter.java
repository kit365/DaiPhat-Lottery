package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.ocrtemplate.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.OcrFieldLayoutRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldLayoutModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.OcrFieldLayoutPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.OcrFieldLayoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OcrFieldLayoutRepositoryAdapter implements OcrFieldLayoutRepositoryPort {

    private final OcrFieldLayoutRepository repository;
    private final OcrFieldLayoutPersistenceMapper mapper;

    @Override
    public OcrFieldLayoutModel save(OcrFieldLayoutModel model) {
        return mapper.toDomain(repository.save(mapper.toEntity(model)));
    }

    @Override
    public Optional<OcrFieldLayoutModel> findById(Long id) {
        return repository.findByIdAndDeletedAtIsNull(id).map(mapper::toDomain);
    }

    @Override
    public List<OcrFieldLayoutModel> findByTemplateId(Long templateId) {
        return repository.findByTemplateIdAndDeletedAtIsNullOrderByFieldNameAscPriorityAsc(templateId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public List<OcrFieldLayoutModel> findByTemplateIdAndFieldName(Long templateId, OcrTemplateFieldName fieldName) {
        return repository
                .findByTemplateIdAndFieldNameAndDeletedAtIsNullOrderByPriorityAsc(templateId, fieldName)
                .stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public boolean existsByTemplateIdAndFieldNameAndPriority(
            Long templateId,
            OcrTemplateFieldName fieldName,
            int priority
    ) {
        return repository.existsByTemplateIdAndFieldNameAndPriorityAndDeletedAtIsNull(
                templateId, fieldName, priority
        );
    }

    @Override
    public int findMaxPriority(Long templateId, OcrTemplateFieldName fieldName) {
        return repository.findMaxPriorityByTemplateIdAndFieldName(templateId, fieldName);
    }
}
