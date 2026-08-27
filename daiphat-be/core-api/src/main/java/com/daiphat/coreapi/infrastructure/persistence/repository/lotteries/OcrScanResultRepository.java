package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrScanResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface OcrScanResultRepository
        extends JpaRepository<OcrScanResultEntity, Long>, JpaSpecificationExecutor<OcrScanResultEntity> {

    List<OcrScanResultEntity> findByAiModelIdAndDeletedAtIsNullOrderByIdAsc(Long aiModelId);
}
