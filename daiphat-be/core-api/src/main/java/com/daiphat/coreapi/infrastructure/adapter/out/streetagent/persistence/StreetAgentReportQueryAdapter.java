package com.daiphat.coreapi.infrastructure.adapter.out.streetagent.persistence;

import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentReportQueryPort;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportOwnerType;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class StreetAgentReportQueryAdapter implements StreetAgentReportQueryPort {

    private static final EnumSet<AllocationBatchStatus> OPEN_BATCH_STATUSES = EnumSet.of(
            AllocationBatchStatus.DRAFT, AllocationBatchStatus.CONFIRMED, AllocationBatchStatus.RETURN_OPEN);

    private final EntityManager entityManager;

    @Override
    public Dataset load(LocalDate from, LocalDate to, Set<DailySalesReportStatus> statuses) {
        List<Object[]> reportResults = entityManager.createQuery("""
                select r.id, a.id, a.lastName, a.firstName, r.reportDate, r.status,
                       r.totalSoldQuantity, r.totalRemainingQuantity, r.totalCashCollected
                from DailySalesReportEntity r
                join r.agent a
                where r.deletedAt is null
                  and r.ownerType = :ownerType
                  and r.reportDate between :from and :to
                  and r.status in :statuses
                """, Object[].class)
                .setParameter("ownerType", DailySalesReportOwnerType.STREET_AGENT)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("statuses", statuses)
                .getResultList();

        List<ReportRow> reportRows = new ArrayList<>();
        List<StationRow> stationRows = new ArrayList<>();
        List<Long> reportIds = reportResults.stream().map(row -> id(row[0])).toList();
        Map<Long, Integer> allocatedByReport = new HashMap<>();

        // Fetch report details separately so detail rows and settlement rows can never multiply each other.
        if (!reportIds.isEmpty()) {
            List<Object[]> detailResults = entityManager.createQuery("""
                    select r.id, station.id, station.name, d.allocatedQuantity, d.soldQuantity,
                           d.remainingQuantity, d.cashCollected
                    from DailySalesReportDetailEntity d
                    join d.report r
                    join d.allocationBatchDetail allocationDetail
                    join allocationDetail.lotteryStation station
                    where d.deletedAt is null
                      and r.id in :reportIds
                    """, Object[].class)
                    .setParameter("reportIds", reportIds)
                    .getResultList();
            for (Object[] detail : detailResults) {
                Long reportId = id(detail[0]);
                int allocated = quantity(detail[3]);
                allocatedByReport.merge(reportId, allocated, Integer::sum);
                stationRows.add(new StationRow(id(detail[1]), string(detail[2]), allocated,
                        quantity(detail[4]), quantity(detail[5]), money(detail[6])));
            }
        }

        for (Object[] report : reportResults) {
            Long reportId = id(report[0]);
            reportRows.add(new ReportRow(reportId, id(report[1]), agentName(string(report[2]), string(report[3])),
                    (LocalDate) report[4], (DailySalesReportStatus) report[5],
                    allocatedByReport.getOrDefault(reportId, 0), quantity(report[6]), quantity(report[7]), money(report[8])));
        }

        List<SettlementRow> settlements = reportIds.isEmpty() ? List.of() : entityManager.createQuery("""
                select r.agent.id, s.commissionAmount, s.agentPays
                from AgentSettlementEntity s
                join s.report r
                where s.deletedAt is null
                  and r.id in :reportIds
                """, Object[].class)
                .setParameter("reportIds", reportIds)
                .getResultList().stream()
                .map(settlement -> new SettlementRow(id(settlement[0]), money(settlement[1]), money(settlement[2])))
                .toList();

        long unsettled = entityManager.createQuery("""
                select count(batch) from AllocationBatchEntity batch
                where batch.deletedAt is null
                  and batch.businessDate between :from and :to
                  and batch.status in :statuses
                """, Long.class)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("statuses", OPEN_BATCH_STATUSES)
                .getSingleResult();
        return new Dataset(reportRows, stationRows, settlements, unsettled);
    }

    private String agentName(String lastName, String firstName) {
        String normalizedFirstName = firstName == null ? "" : firstName.trim();
        String normalizedLastName = lastName == null ? "" : lastName.trim();
        return (normalizedLastName + " " + normalizedFirstName).trim();
    }

    private Long id(Object value) {
        return ((Number) value).longValue();
    }

    private int quantity(Object value) {
        return value == null ? 0 : ((Number) value).intValue();
    }

    private BigDecimal money(Object value) {
        return value == null ? BigDecimal.ZERO : (BigDecimal) value;
    }

    private String string(Object value) {
        return value == null ? "" : value.toString();
    }
}
