package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrFieldLayoutEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OcrFieldLayoutRepository extends JpaRepository<OcrFieldLayoutEntity, Long> {

    Optional<OcrFieldLayoutEntity> findByIdAndDeletedAtIsNull(Long id);

    List<OcrFieldLayoutEntity> findByTemplateIdAndDeletedAtIsNullOrderByFieldNameAscPriorityAsc(Long templateId);

    List<OcrFieldLayoutEntity> findByTemplateIdAndFieldNameAndDeletedAtIsNullOrderByPriorityAsc(
            Long templateId,
            OcrTemplateFieldName fieldName
    );

    boolean existsByTemplateIdAndFieldNameAndPriorityAndDeletedAtIsNull(
            Long templateId,
            OcrTemplateFieldName fieldName,
            int priority
    );

    @Query("""
            SELECT COALESCE(MAX(l.priority), 0)
            FROM OcrFieldLayoutEntity l
            WHERE l.templateId = :templateId
              AND l.fieldName = :fieldName
              AND l.deletedAt IS NULL
            """)
    int findMaxPriorityByTemplateIdAndFieldName(
            @Param("templateId") Long templateId,
            @Param("fieldName") OcrTemplateFieldName fieldName
    );
}
