package com.daiphat.coreapi.application.assembler.streetagent;

import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentReportResponse;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentReportQueryPort;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

/**
 * Builds read-model projections from the report query dataset.
 * This is application-layer aggregation, not a domain entity or transport DTO.
 */
public final class StreetAgentReportAssembler {

    private StreetAgentReportAssembler() {
    }

    public static ReportView assemble(
            LocalDate from,
            LocalDate to,
            List<String> statuses,
            StreetAgentReportQueryPort.Dataset dataset) {
        Map<Long, Money> settlementByAgent = settlementsByAgent(dataset.settlements());
        List<StreetAgentReportResponse.Agent> agents = agents(dataset.reports(), settlementByAgent);
        List<StreetAgentReportResponse.Station> stations = stations(dataset.stations());

        int allocated = dataset.reports().stream().mapToInt(StreetAgentReportQueryPort.ReportRow::allocatedQuantity).sum();
        int sold = dataset.reports().stream().mapToInt(StreetAgentReportQueryPort.ReportRow::soldQuantity).sum();
        int returned = dataset.reports().stream().mapToInt(StreetAgentReportQueryPort.ReportRow::returnedQuantity).sum();
        long openReports = dataset.reports().stream()
                .filter(report -> report.status() == DailySalesReportStatus.OPEN)
                .count();
        long finalizedReports = dataset.reports().size() - openReports;
        boolean provisional = dataset.unsettledBatchCount() > 0 || openReports > 0;

        StreetAgentReportResponse.Overview overview = new StreetAgentReportResponse.Overview(
                new StreetAgentReportResponse.Period(from, to, statuses),
                dataset.reports().size(), openReports, finalizedReports, dataset.unsettledBatchCount(), provisional,
                new StreetAgentReportResponse.Summary(
                        allocated, sold, returned, sum(dataset.reports(), StreetAgentReportQueryPort.ReportRow::grossSales),
                        sum(settlementByAgent.values(), Money::commission),
                        sum(settlementByAgent.values(), Money::remitted), rate(sold, allocated)));
        return new ReportView(overview, agents, stations);
    }

    private static Map<Long, Money> settlementsByAgent(List<StreetAgentReportQueryPort.SettlementRow> settlements) {
        Map<Long, Money> result = new HashMap<>();
        for (StreetAgentReportQueryPort.SettlementRow settlement : settlements) {
            result.merge(settlement.agentId(),
                    new Money(settlement.commissionPayable(), settlement.agentCashRemitted()), Money::add);
        }
        return result;
    }

    private static List<StreetAgentReportResponse.Agent> agents(
            List<StreetAgentReportQueryPort.ReportRow> reports,
            Map<Long, Money> settlementByAgent) {
        Map<Long, AgentAccumulator> accumulators = new HashMap<>();
        for (StreetAgentReportQueryPort.ReportRow report : reports) {
            accumulators.computeIfAbsent(report.agentId(), ignored -> new AgentAccumulator(report.agentId(), report.agentName()))
                    .add(report);
        }
        return accumulators.values().stream()
                .map(agent -> agent.toResponse(settlementByAgent.getOrDefault(agent.agentId, Money.ZERO)))
                .toList();
    }

    private static List<StreetAgentReportResponse.Station> stations(
            List<StreetAgentReportQueryPort.StationRow> stationRows) {
        Map<Long, StationAccumulator> accumulators = new HashMap<>();
        for (StreetAgentReportQueryPort.StationRow station : stationRows) {
            accumulators.computeIfAbsent(station.stationId(),
                    ignored -> new StationAccumulator(station.stationId(), station.stationName())).add(station);
        }
        return accumulators.values().stream().map(StationAccumulator::toResponse).toList();
    }

    private static <T> BigDecimal sum(Collection<T> values, Function<T, BigDecimal> value) {
        return values.stream().map(value).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal rate(int numerator, int denominator) {
        return denominator == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(numerator)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }

    public record ReportView(
            StreetAgentReportResponse.Overview overview,
            List<StreetAgentReportResponse.Agent> agents,
            List<StreetAgentReportResponse.Station> stations) {
    }

    private record Money(BigDecimal commission, BigDecimal remitted) {
        private static final Money ZERO = new Money(BigDecimal.ZERO, BigDecimal.ZERO);

        private Money {
            commission = commission == null ? BigDecimal.ZERO : commission;
            remitted = remitted == null ? BigDecimal.ZERO : remitted;
        }

        private Money add(Money other) {
            return new Money(commission.add(other.commission), remitted.add(other.remitted));
        }
    }

    private static final class AgentAccumulator {
        private final Long agentId;
        private final String agentName;
        private long reportCount;
        private int allocated;
        private int sold;
        private int returned;
        private BigDecimal grossSales = BigDecimal.ZERO;

        private AgentAccumulator(Long agentId, String agentName) {
            this.agentId = agentId;
            this.agentName = agentName;
        }

        private void add(StreetAgentReportQueryPort.ReportRow report) {
            reportCount++;
            allocated += report.allocatedQuantity();
            sold += report.soldQuantity();
            returned += report.returnedQuantity();
            grossSales = grossSales.add(report.grossSales() == null ? BigDecimal.ZERO : report.grossSales());
        }

        private StreetAgentReportResponse.Agent toResponse(Money settlement) {
            return new StreetAgentReportResponse.Agent(agentId, agentName, reportCount, allocated, sold, returned,
                    grossSales, settlement.commission(), settlement.remitted(), rate(sold, allocated));
        }
    }

    private static final class StationAccumulator {
        private final Long stationId;
        private final String stationName;
        private int allocated;
        private int sold;
        private int returned;
        private BigDecimal grossSales = BigDecimal.ZERO;

        private StationAccumulator(Long stationId, String stationName) {
            this.stationId = stationId;
            this.stationName = stationName;
        }

        private void add(StreetAgentReportQueryPort.StationRow station) {
            allocated += station.allocatedQuantity();
            sold += station.soldQuantity();
            returned += station.returnedQuantity();
            grossSales = grossSales.add(station.grossSales() == null ? BigDecimal.ZERO : station.grossSales());
        }

        private StreetAgentReportResponse.Station toResponse() {
            return new StreetAgentReportResponse.Station(stationId, stationName, allocated, sold, returned,
                    grossSales, rate(sold, allocated));
        }
    }
}
