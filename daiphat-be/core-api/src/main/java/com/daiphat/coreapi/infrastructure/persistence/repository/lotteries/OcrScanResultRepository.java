package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrScanResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface OcrScanResultRepository
        extends JpaRepository<OcrScanResultEntity, Long>, JpaSpecificationExecutor<OcrScanResultEntity> {
}
