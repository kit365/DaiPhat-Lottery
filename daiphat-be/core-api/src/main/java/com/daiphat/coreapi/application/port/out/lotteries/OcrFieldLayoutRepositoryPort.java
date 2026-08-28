package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldLayoutModel;

import java.util.List;
import java.util.Optional;

public interface OcrFieldLayoutRepositoryPort {

    OcrFieldLayoutModel save(OcrFieldLayoutModel model);

    Optional<OcrFieldLayoutModel> findById(Long id);

    List<OcrFieldLayoutModel> findByTemplateId(Long templateId);

    List<OcrFieldLayoutModel> findByTemplateIdAndFieldName(Long templateId, OcrTemplateFieldName fieldName);

    boolean existsByTemplateIdAndFieldNameAndPriority(
            Long templateId,
            OcrTemplateFieldName fieldName,
            int priority
    );

    int findMaxPriority(Long templateId, OcrTemplateFieldName fieldName);
}
