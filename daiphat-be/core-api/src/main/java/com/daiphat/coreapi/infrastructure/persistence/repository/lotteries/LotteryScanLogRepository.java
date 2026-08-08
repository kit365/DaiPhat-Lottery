package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryScanLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface LotteryScanLogRepository
        extends JpaRepository<LotteryScanLogEntity, Long>,
        JpaSpecificationExecutor<LotteryScanLogEntity> {
}
