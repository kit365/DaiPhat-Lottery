package com.daiphat.coreapi.application.port.out.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.AgentSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VendorSettlementProjectionRepositoryPort {

    record SettlementRecord(
            Long id,
            Long agentId,
            Long allocationBatchId,
            Long reportId,
            LocalDate settlementDate,
            BigDecimal returnedValue,
            BigDecimal soldValue,
            BigDecimal commissionAmount,
            BigDecimal depositAmount,
            BigDecimal agentReceives,
            BigDecimal agentPays,
            AgentSettlementStatus status,
            LocalDateTime paidAt,
            UUID collectedBy,
            LocalDateTime collectedAt,
            Long returnBatchId
    ) {
        public SettlementRecord(
                Long id, Long agentId, Long allocationBatchId, Long reportId,
                LocalDate settlementDate, BigDecimal returnedValue, BigDecimal soldValue,
                BigDecimal commissionAmount, BigDecimal depositAmount, BigDecimal agentReceives,
                BigDecimal agentPays, AgentSettlementStatus status, LocalDateTime paidAt,
                UUID collectedBy, LocalDateTime collectedAt) {
            this(id, agentId, allocationBatchId, reportId, settlementDate, returnedValue, soldValue,
                    commissionAmount, depositAmount, agentReceives, agentPays, status, paidAt,
                    collectedBy, collectedAt, null);
        }
    }

    record ReportDetailRecord(
            Long detailId,
            int allocatedQuantity,
            int soldQuantity,
            int remainingQuantity,
            BigDecimal cashCollected
    ) {}

    record ReportRecord(
            Long id,
            Long agentId,
            LocalDate reportDate,
            DailySalesReportStatus status,
            int totalSoldQuantity,
            int totalRemainingQuantity,
            BigDecimal totalCashCollected,
            List<ReportDetailRecord> details
    ) {}

    record TerminalBatchSample(
            Long batchId,
            Long agentId,
            LocalDate businessDate,
            String status,
            int allocatedQuantity,
            int soldQuantity,
            int returnedQuantity,
            BigDecimal faceValueSnapshot,
            BigDecimal grossCashRemitted,
            LocalDateTime settledAt,
            List<ReportDetailRecord> details
    ) {}

    Optional<SettlementRecord> findSettlementByBatchId(Long batchId);

    SettlementRecord saveSettlement(SettlementRecord settlement);

    Optional<ReportRecord> findReportByAgentAndDateForUpdate(Long agentId, LocalDate reportDate);

    ReportRecord saveReport(ReportRecord report);

    List<TerminalBatchSample> findTerminalBatchesForAgentAndDate(Long agentId, LocalDate reportDate);

    List<TerminalBatchSample> findLastTerminalBatches(Long agentId, int limit);

    boolean existsOpenBatch(Long agentId, LocalDate businessDate);

    List<ReportRecord> findOpenReportsForDate(LocalDate reportDate);

    List<ReportRecord> findOpenReportsBefore(LocalDate exclusiveDate);
}
