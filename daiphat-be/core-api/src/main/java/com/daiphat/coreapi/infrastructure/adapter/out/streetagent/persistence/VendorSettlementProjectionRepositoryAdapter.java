package com.daiphat.coreapi.infrastructure.adapter.out.streetagent.persistence;

import com.daiphat.coreapi.application.port.out.streetagent.VendorSettlementProjectionRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportOwnerType;
import com.daiphat.coreapi.domain.service.streetagent.VendorDailySalesCashCalculator;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.*;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.AgentSettlementRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.AllocationBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.DailySalesReportRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.StreetAgentProfileRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class VendorSettlementProjectionRepositoryAdapter implements VendorSettlementProjectionRepositoryPort {

    private static final EnumSet<AllocationBatchStatus> TERMINAL = EnumSet.of(
            AllocationBatchStatus.SETTLED, AllocationBatchStatus.LATE_SETTLED);
    private static final EnumSet<AllocationBatchStatus> OPEN = EnumSet.of(
            AllocationBatchStatus.DRAFT, AllocationBatchStatus.CONFIRMED, AllocationBatchStatus.RETURN_OPEN);

    private final AgentSettlementRepository agentSettlementRepository;
    private final DailySalesReportRepository dailySalesReportRepository;
    private final AllocationBatchRepository allocationBatchRepository;
    private final StreetAgentProfileRepository streetAgentProfileRepository;
    private final ReturnBatchRepository returnBatchRepository;
    private final EntityManager entityManager;

    @Override
    public Optional<SettlementRecord> findSettlementByBatchId(Long batchId) {
        return agentSettlementRepository.findByAllocationBatch_IdAndDeletedAtIsNull(batchId)
                .map(this::toSettlementRecord);
    }

    @Override
    public SettlementRecord saveSettlement(SettlementRecord settlement) {
        AgentSettlementEntity entity = settlement.id() == null
                ? new AgentSettlementEntity()
                : agentSettlementRepository.findById(settlement.id()).orElseGet(AgentSettlementEntity::new);
        entity.setAgent(streetAgentProfileRepository.getReferenceById(settlement.agentId()));
        entity.setAllocationBatch(allocationBatchRepository.getReferenceById(settlement.allocationBatchId()));
        entity.setReturnBatch(settlement.returnBatchId() == null ? null
                : returnBatchRepository.getReferenceById(settlement.returnBatchId()));
        if (settlement.reportId() != null) {
            entity.setReport(dailySalesReportRepository.getReferenceById(settlement.reportId()));
        }
        entity.setSettlementDate(settlement.settlementDate());
        entity.setReturnedValue(settlement.returnedValue());
        entity.setSoldValue(settlement.soldValue());
        entity.setCommissionAmount(settlement.commissionAmount());
        entity.setDepositAmount(settlement.depositAmount());
        entity.setAgentReceives(settlement.agentReceives());
        entity.setAgentPays(settlement.agentPays());
        entity.setStatus(settlement.status());
        entity.setPaidAt(settlement.paidAt());
        entity.setCollectedBy(settlement.collectedBy());
        entity.setCollectedAt(settlement.collectedAt());
        return toSettlementRecord(agentSettlementRepository.save(entity));
    }

    @Override
    public Optional<ReportRecord> findReportByAgentAndDateForUpdate(Long agentId, LocalDate reportDate) {
        return dailySalesReportRepository.findByAgentIdAndReportDateForUpdate(agentId, reportDate)
                .map(this::toReportRecord);
    }

    @Override
    public ReportRecord saveReport(ReportRecord report) {
        DailySalesReportEntity entity = report.id() == null
                ? new DailySalesReportEntity()
                : dailySalesReportRepository.findById(report.id()).orElseGet(DailySalesReportEntity::new);
        entity.setAgent(streetAgentProfileRepository.getReferenceById(report.agentId()));
        entity.setOwnerType(DailySalesReportOwnerType.STREET_AGENT);
        entity.setReportDate(report.reportDate());
        entity.setStatus(report.status());
        entity.setTotalSoldQuantity(report.totalSoldQuantity());
        entity.setTotalRemainingQuantity(report.totalRemainingQuantity());
        entity.setTotalCashCollected(report.totalCashCollected());

        Map<Long, DailySalesReportDetailEntity> existingByDetailId = entity.getDetails().stream()
                .filter(d -> d.getAllocationBatchDetail() != null && d.getAllocationBatchDetail().getId() != null)
                .collect(Collectors.toMap(d -> d.getAllocationBatchDetail().getId(), Function.identity(), (a, b) -> a));

        List<DailySalesReportDetailEntity> nextDetails = new ArrayList<>();
        for (ReportDetailRecord detail : report.details()) {
            DailySalesReportDetailEntity detailEntity = existingByDetailId.getOrDefault(
                    detail.detailId(), new DailySalesReportDetailEntity());
            detailEntity.setReport(entity);
            detailEntity.setAllocationBatchDetail(
                    entityManager.getReference(AllocationBatchDetailEntity.class, detail.detailId()));
            detailEntity.setAllocatedQuantity(detail.allocatedQuantity());
            detailEntity.setSoldQuantity(detail.soldQuantity());
            detailEntity.setRemainingQuantity(detail.remainingQuantity());
            detailEntity.setCashCollected(detail.cashCollected());
            nextDetails.add(detailEntity);
        }
        entity.getDetails().clear();
        entity.getDetails().addAll(nextDetails);
        return toReportRecord(dailySalesReportRepository.save(entity));
    }

    @Override
    public List<TerminalBatchSample> findTerminalBatchesForAgentAndDate(Long agentId, LocalDate reportDate) {
        return allocationBatchRepository.findByProfileAndDateAndStatuses(agentId, reportDate, TERMINAL).stream()
                .map(this::toTerminalSample)
                .toList();
    }

    @Override
    public List<TerminalBatchSample> findLastTerminalBatches(Long agentId, int limit) {
        return allocationBatchRepository.findLastTerminalBatches(
                        agentId, TERMINAL, PageRequest.of(0, Math.max(limit, 1))).stream()
                .map(this::toTerminalSample)
                .toList();
    }

    @Override
    public boolean existsOpenBatch(Long agentId, LocalDate businessDate) {
        return allocationBatchRepository.existsOpenBatchForDate(agentId, businessDate, OPEN);
    }

    @Override
    public List<ReportRecord> findOpenReportsForDate(LocalDate reportDate) {
        return dailySalesReportRepository
                .findByReportDateAndStatusAndDeletedAtIsNull(reportDate, DailySalesReportStatus.OPEN)
                .stream()
                .map(this::toReportRecord)
                .toList();
    }

    @Override
    public List<ReportRecord> findOpenReportsBefore(LocalDate exclusiveDate) {
        return dailySalesReportRepository
                .findByReportDateBeforeAndStatusAndDeletedAtIsNull(exclusiveDate, DailySalesReportStatus.OPEN)
                .stream()
                .map(this::toReportRecord)
                .toList();
    }

    private SettlementRecord toSettlementRecord(AgentSettlementEntity entity) {
        return new SettlementRecord(
                entity.getId(),
                entity.getAgent().getId(),
                entity.getAllocationBatch().getId(),
                entity.getReport() == null ? null : entity.getReport().getId(),
                entity.getSettlementDate(),
                entity.getReturnedValue(),
                entity.getSoldValue(),
                entity.getCommissionAmount(),
                entity.getDepositAmount(),
                entity.getAgentReceives(),
                entity.getAgentPays(),
                entity.getStatus(),
                entity.getPaidAt(),
                entity.getCollectedBy(),
                entity.getCollectedAt(),
                entity.getReturnBatch() == null ? null : entity.getReturnBatch().getId()
        );
    }

    private ReportRecord toReportRecord(DailySalesReportEntity entity) {
        List<ReportDetailRecord> details = entity.getDetails() == null
                ? List.of()
                : entity.getDetails().stream()
                .map(d -> new ReportDetailRecord(
                        d.getAllocationBatchDetail().getId(),
                        d.getAllocatedQuantity(),
                        d.getSoldQuantity(),
                        d.getRemainingQuantity(),
                        d.getCashCollected()))
                .toList();
        return new ReportRecord(
                entity.getId(),
                entity.getAgent().getId(),
                entity.getReportDate(),
                entity.getStatus(),
                entity.getTotalSoldQuantity(),
                entity.getTotalRemainingQuantity(),
                entity.getTotalCashCollected(),
                details
        );
    }

    private TerminalBatchSample toTerminalSample(AllocationBatchEntity batch) {
        BigDecimal faceValue = batch.getFaceValueSnapshot();
        List<ReportDetailRecord> details = batch.getDetails() == null
                ? List.of()
                : batch.getDetails().stream()
                .map(d -> {
                    int remaining = d.getReturnedQuantity() == null ? 0 : d.getReturnedQuantity();
                    int sold = d.getSoldQuantity() == null ? 0 : d.getSoldQuantity();
                    int allocated = sold + remaining;
                    BigDecimal cash = VendorDailySalesCashCalculator.cashCollected(sold, faceValue);
                    return new ReportDetailRecord(d.getId(), allocated, sold, remaining, cash);
                })
                .toList();
        return new TerminalBatchSample(
                batch.getId(),
                batch.getStreetAgentProfile().getId(),
                batch.getBusinessDate(),
                batch.getStatus().name(),
                batch.getAllocatedQuantity() == null ? 0 : batch.getAllocatedQuantity(),
                batch.getSoldQuantity() == null ? 0 : batch.getSoldQuantity(),
                batch.getReturnedQuantity() == null ? 0 : batch.getReturnedQuantity(),
                faceValue,
                batch.getGrossCashRemitted(),
                batch.getSettledAt(),
                details
        );
    }
}
