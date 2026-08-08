package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrScanResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OcrScanResultRepository extends JpaRepository<OcrScanResultEntity, Long> {
}
