package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.DailySalesReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailySalesReportRepository extends JpaRepository<DailySalesReportEntity, Long> {
}
