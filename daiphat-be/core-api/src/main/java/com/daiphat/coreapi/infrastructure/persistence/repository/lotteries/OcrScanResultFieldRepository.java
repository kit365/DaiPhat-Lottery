package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrScanResultFieldEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OcrScanResultFieldRepository extends JpaRepository<OcrScanResultFieldEntity, Long> {

    List<OcrScanResultFieldEntity> findByOcrScanResultIdAndDeletedAtIsNullOrderByFieldNameAsc(Long ocrScanResultId);

    Optional<OcrScanResultFieldEntity> findByOcrScanResultIdAndFieldNameAndDeletedAtIsNull(
            Long ocrScanResultId,
            OcrTemplateFieldName fieldName
    );

    boolean existsByOcrScanResultIdAndDeletedAtIsNull(Long ocrScanResultId);
}
