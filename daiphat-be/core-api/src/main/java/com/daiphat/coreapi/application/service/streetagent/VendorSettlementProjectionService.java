package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.port.in.streetagent.VendorDailyReportFinalizationUseCase;
import com.daiphat.coreapi.application.port.in.streetagent.VendorSettlementProjectionServicePort;
import com.daiphat.coreapi.application.policy.streetagent.VendorConfidencePolicyResolver;
import com.daiphat.coreapi.application.port.out.streetagent.VendorSettlementProjectionRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.VendorSettlementProjectionRepositoryPort.ReportDetailRecord;
import com.daiphat.coreapi.application.port.out.streetagent.VendorSettlementProjectionRepositoryPort.ReportRecord;
import com.daiphat.coreapi.application.port.out.streetagent.VendorSettlementProjectionRepositoryPort.SettlementRecord;
import com.daiphat.coreapi.application.port.out.streetagent.VendorSettlementProjectionRepositoryPort.TerminalBatchSample;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationBatchDetailModel;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationBatchModel;
import com.daiphat.coreapi.domain.service.streetagent.AgentSettlementProjector;
import com.daiphat.coreapi.domain.service.streetagent.VendorConfidenceCalculator;
import com.daiphat.coreapi.domain.service.streetagent.VendorDailySalesCashCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VendorSettlementProjectionService
        implements VendorSettlementProjectionServicePort, VendorDailyReportFinalizationUseCase {

    private final VendorSettlementProjectionRepositoryPort projectionRepositoryPort;
    private final VendorConfidencePolicyResolver confidencePolicyResolver;

    @Override
    @Transactional
    public ProjectionLinks projectOnSettle(
            VendorAllocationBatchModel batch,
            StreetAgentProfileModel profile,
            UUID operatorId,
            LocalDateTime settledAt,
            Long returnBatchId) {
        ReportRecord report = upsertDailyReport(batch);
        SettlementRecord settlement = upsertSettlement(batch, report.id(), settledAt, operatorId, returnBatchId);
        recalculateConfidence(profile, settledAt);
        return new ProjectionLinks(settlement.id(), report.id());
    }

    @Override
    @Transactional
    public int finalizeOpenReports(LocalDate reportDate) {
        return finalize(projectionRepositoryPort.findOpenReportsForDate(reportDate));
    }

    /** Closes all overdue reports once every batch for the report date is terminal. */
    @Override
    @Transactional
    public int finalizeOverdueReports(LocalDate today) {
        return finalize(projectionRepositoryPort.findOpenReportsBefore(today));
    }

    private int finalize(List<ReportRecord> reports) {
        int finalized = 0;
        for (ReportRecord report : reports) {
            if (projectionRepositoryPort.existsOpenBatch(report.agentId(), report.reportDate())) {
                continue;
            }
            projectionRepositoryPort.saveReport(new ReportRecord(
                    report.id(),
                    report.agentId(),
                    report.reportDate(),
                    DailySalesReportStatus.FINALIZED,
                    report.totalSoldQuantity(),
                    report.totalRemainingQuantity(),
                    report.totalCashCollected(),
                    report.details()
            ));
            finalized++;
        }
        return finalized;
    }

    private SettlementRecord upsertSettlement(
            VendorAllocationBatchModel batch,
            Long reportId,
            LocalDateTime settledAt,
            UUID operatorId,
            Long returnBatchId) {
        AgentSettlementProjector.Projection projection =
                AgentSettlementProjector.project(batch, settledAt, operatorId);
        SettlementRecord existing = projectionRepositoryPort.findSettlementByBatchId(batch.getId()).orElse(null);
        return projectionRepositoryPort.saveSettlement(new SettlementRecord(
                existing == null ? null : existing.id(),
                batch.getStreetAgentProfileId(),
                batch.getId(),
                reportId,
                projection.settlementDate(),
                projection.returnedValue(),
                projection.soldValue(),
                projection.commissionAmount(),
                projection.depositAmount(),
                projection.agentReceives(),
                projection.agentPays(),
                projection.status(),
                projection.paidAt(),
                projection.collectedBy(),
                projection.collectedAt(),
                returnBatchId
        ));
    }

    private ReportRecord upsertDailyReport(VendorAllocationBatchModel batch) {
        LocalDate reportDate = batch.getBusinessDate();
        ReportRecord existing = projectionRepositoryPort
                .findReportByAgentAndDateForUpdate(batch.getStreetAgentProfileId(), reportDate)
                .orElse(null);

        List<TerminalBatchSample> terminalBatches = projectionRepositoryPort
                .findTerminalBatchesForAgentAndDate(batch.getStreetAgentProfileId(), reportDate);

        Map<Long, ReportDetailRecord> byDetailId = terminalBatches.stream()
                .flatMap(sample -> sample.details().stream())
                .collect(Collectors.toMap(
                        ReportDetailRecord::detailId,
                        Function.identity(),
                        (left, right) -> right));

        for (VendorAllocationBatchDetailModel detail : batch.getDetails()) {
            if (detail.getId() == null) {
                continue;
            }
            int remaining = detail.getReturnedQuantity();
            int sold = detail.getSoldQuantity();
            int allocated = sold + remaining;
            BigDecimal cash = VendorDailySalesCashCalculator.cashCollected(sold, batch.getFaceValueSnapshot());
            byDetailId.put(detail.getId(), new ReportDetailRecord(
                    detail.getId(), allocated, sold, remaining, cash));
        }

        List<ReportDetailRecord> details = new ArrayList<>(byDetailId.values());
        int totalSold = details.stream().mapToInt(ReportDetailRecord::soldQuantity).sum();
        int totalRemaining = details.stream().mapToInt(ReportDetailRecord::remainingQuantity).sum();
        BigDecimal totalCash = details.stream()
                .map(ReportDetailRecord::cashCollected)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return projectionRepositoryPort.saveReport(new ReportRecord(
                existing == null ? null : existing.id(),
                batch.getStreetAgentProfileId(),
                reportDate,
                existing == null ? DailySalesReportStatus.OPEN : existing.status(),
                totalSold,
                totalRemaining,
                totalCash,
                details
        ));
    }

    private void recalculateConfidence(StreetAgentProfileModel profile, LocalDateTime calculatedAt) {
        VendorConfidenceCalculator.Policy policy = confidencePolicyResolver.resolveValidatedPolicy();
        List<TerminalBatchSample> samples = projectionRepositoryPort.findLastTerminalBatches(
                profile.getId(), policy.experienceWindow());
        List<VendorConfidenceCalculator.BatchSample> batchSamples = samples.stream()
                .map(sample -> new VendorConfidenceCalculator.BatchSample(
                        AllocationBatchStatus.valueOf(sample.status()),
                        sample.allocatedQuantity(),
                        sample.soldQuantity()))
                .toList();
        VendorConfidenceCalculator.Result result = VendorConfidenceCalculator.calculate(batchSamples, policy);
        profile.setConfidenceScore(result.score());
        profile.setConfidenceTier(result.tier());
        profile.setConfidenceCalculatedAt(calculatedAt);
    }
}
