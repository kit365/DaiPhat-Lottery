package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrFieldValidationRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OcrFieldValidationRuleRepository extends JpaRepository<OcrFieldValidationRuleEntity, Long> {

    Optional<OcrFieldValidationRuleEntity> findByIdAndDeletedAtIsNull(Long id);

    List<OcrFieldValidationRuleEntity> findByTemplateIdAndDeletedAtIsNullOrderBySortOrderAscIdAsc(Long templateId);

    List<OcrFieldValidationRuleEntity> findByTemplateIdAndActiveTrueAndDeletedAtIsNullOrderBySortOrderAscIdAsc(
            Long templateId
    );

    List<OcrFieldValidationRuleEntity>
            findByTemplateIdAndFieldNameAndActiveTrueAndDeletedAtIsNullOrderBySortOrderAscIdAsc(
                    Long templateId,
                    OcrTemplateFieldName fieldName
            );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM OcrFieldValidationRuleEntity r WHERE r.templateId = :templateId")
    int hardDeleteByTemplateId(@Param("templateId") Long templateId);
}
