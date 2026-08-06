package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.DailySalesReportDetailEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailySalesReportDetailRepository extends JpaRepository<DailySalesReportDetailEntity, Long> {
}
