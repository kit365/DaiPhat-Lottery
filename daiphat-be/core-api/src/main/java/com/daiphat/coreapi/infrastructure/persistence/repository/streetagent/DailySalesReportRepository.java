package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.DailySalesReportEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailySalesReportRepository extends JpaRepository<DailySalesReportEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select r from DailySalesReportEntity r
            left join fetch r.details
            where r.agent.id = :agentId and r.reportDate = :reportDate and r.deletedAt is null
            """)
    Optional<DailySalesReportEntity> findByAgentIdAndReportDateForUpdate(
            @Param("agentId") Long agentId,
            @Param("reportDate") LocalDate reportDate);

    Page<DailySalesReportEntity> findByAgent_IdAndDeletedAtIsNullOrderByReportDateDesc(
            Long agentId, Pageable pageable);

    List<DailySalesReportEntity> findByReportDateAndStatusAndDeletedAtIsNull(
            LocalDate reportDate, DailySalesReportStatus status);

    List<DailySalesReportEntity> findByReportDateBeforeAndStatusAndDeletedAtIsNull(
            LocalDate exclusiveDate, DailySalesReportStatus status);

    Optional<DailySalesReportEntity> findByIdAndDeletedAtIsNull(Long id);
}
