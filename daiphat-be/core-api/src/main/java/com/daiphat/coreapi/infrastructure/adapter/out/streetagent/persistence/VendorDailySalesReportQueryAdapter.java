package com.daiphat.coreapi.infrastructure.adapter.out.streetagent.persistence;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.DailySalesReportDetailResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.DailySalesReportResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.DailySalesReportSettlementLinkResponse;
import com.daiphat.coreapi.application.port.out.streetagent.VendorDailySalesReportQueryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.AgentSettlementEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.DailySalesReportDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.DailySalesReportEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.AgentSettlementRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.DailySalesReportRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.StreetAgentProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class VendorDailySalesReportQueryAdapter implements VendorDailySalesReportQueryPort {

    private final DailySalesReportRepository dailySalesReportRepository;
    private final AgentSettlementRepository agentSettlementRepository;
    private final StreetAgentProfileRepository streetAgentProfileRepository;

    @Override
    public boolean profileExists(Long profileId) {
        return streetAgentProfileRepository.existsById(profileId);
    }

    @Override
    public PageResponse<DailySalesReportResponse> listByProfile(Long profileId, int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(size, 1);
        Page<DailySalesReportEntity> result = dailySalesReportRepository
                .findByAgent_IdAndDeletedAtIsNullOrderByReportDateDesc(
                        profileId, PageRequest.of(safePage - 1, safeSize));
        return PageResponse.from(result.map(this::toSummary), safePage, safeSize);
    }

    @Override
    public DailySalesReportResponse getById(Long reportId) {
        DailySalesReportEntity report = dailySalesReportRepository.findByIdAndDeletedAtIsNull(reportId)
                .orElseThrow(() -> new DomainException(ErrorCode.DAILY_SALES_REPORT_NOT_FOUND));
        return toDetail(report);
    }

    private DailySalesReportResponse toSummary(DailySalesReportEntity report) {
        return new DailySalesReportResponse(
                report.getId(),
                report.getAgent().getId(),
                report.getReportDate(),
                report.getStatus().name(),
                report.getTotalSoldQuantity(),
                report.getTotalRemainingQuantity(),
                report.getTotalCashCollected(),
                List.of(),
                List.of()
        );
    }

    private DailySalesReportResponse toDetail(DailySalesReportEntity report) {
        List<DailySalesReportDetailResponse> details = report.getDetails().stream()
                .map(this::toDetailResponse)
                .toList();
        List<DailySalesReportSettlementLinkResponse> settlements = agentSettlementRepository
                .findByReport_IdAndDeletedAtIsNull(report.getId())
                .stream()
                .map(this::toSettlementLink)
                .toList();
        return new DailySalesReportResponse(
                report.getId(),
                report.getAgent().getId(),
                report.getReportDate(),
                report.getStatus().name(),
                report.getTotalSoldQuantity(),
                report.getTotalRemainingQuantity(),
                report.getTotalCashCollected(),
                details,
                settlements
        );
    }

    private DailySalesReportDetailResponse toDetailResponse(DailySalesReportDetailEntity detail) {
        var allocationDetail = detail.getAllocationBatchDetail();
        Long batchId = allocationDetail.getAllocationBatch() == null
                ? null
                : allocationDetail.getAllocationBatch().getId();
        Long stationId = allocationDetail.getLotteryStation() == null
                ? null
                : allocationDetail.getLotteryStation().getId();
        return new DailySalesReportDetailResponse(
                allocationDetail.getId(),
                batchId,
                stationId,
                detail.getAllocatedQuantity(),
                detail.getSoldQuantity(),
                detail.getRemainingQuantity(),
                detail.getCashCollected()
        );
    }

    private DailySalesReportSettlementLinkResponse toSettlementLink(AgentSettlementEntity settlement) {
        return new DailySalesReportSettlementLinkResponse(
                settlement.getId(),
                settlement.getAllocationBatch().getId(),
                settlement.getAllocationBatch().getBatchCode(),
                settlement.getSettlementDate(),
                settlement.getAgentReceives(),
                settlement.getAgentPays(),
                settlement.getStatus().name()
        );
    }
}
