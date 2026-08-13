package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.document.SpreadsheetDocument;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentReportResponse;
import com.daiphat.coreapi.application.assembler.streetagent.StreetAgentReportAssembler;
import com.daiphat.coreapi.application.export.streetagent.StreetAgentReportExcelExportStrategy;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentReportServicePort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentReportQueryPort;
import com.daiphat.coreapi.application.service.document.SpreadsheetExportService;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StreetAgentReportService implements StreetAgentReportServicePort {

    private static final String DEFAULT_SORT_FIELD = "grossSales";
    private static final Set<String> AGENT_SORT_FIELDS = Set.of(
            "agentName", "reportCount", "allocatedQuantity", "soldQuantity", "returnedQuantity",
            "grossSales", "commissionPayable", "agentCashRemitted", "sellThroughRate");
    private static final Set<String> STATION_SORT_FIELDS = Set.of(
            "stationName", "allocatedQuantity", "soldQuantity", "returnedQuantity", "grossSales", "sellThroughRate");

    private final StreetAgentReportQueryPort streetAgentReportQueryPort;
    private final SpreadsheetExportService spreadsheetExportService;
    private final StreetAgentReportExcelExportStrategy streetAgentReportExcelExportStrategy;

    @Override
    @Transactional(readOnly = true)
    public StreetAgentReportResponse.Overview getOverview(
            LocalDate from, LocalDate to, DailySalesReportStatus status) {
        return load(from, to, status).overview();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StreetAgentReportResponse.Agent> getAgents(
            LocalDate from, LocalDate to, DailySalesReportStatus status,
            int page, int size, String sortBy, String direction) {
        List<StreetAgentReportResponse.Agent> records = new ArrayList<>(load(from, to, status).agents());
        SortSelection sort = resolveSort(sortBy, direction, AGENT_SORT_FIELDS);
        records.sort(agentComparator(sort.field(), sort.direction()));
        return page(records, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StreetAgentReportResponse.Station> getStations(
            LocalDate from, LocalDate to, DailySalesReportStatus status,
            int page, int size, String sortBy, String direction) {
        List<StreetAgentReportResponse.Station> records = new ArrayList<>(load(from, to, status).stations());
        SortSelection sort = resolveSort(sortBy, direction, STATION_SORT_FIELDS);
        records.sort(stationComparator(sort.field(), sort.direction()));
        return page(records, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public SpreadsheetDocument export(LocalDate from, LocalDate to, DailySalesReportStatus status) {
        StreetAgentReportAssembler.ReportView report = load(from, to, status);
        return spreadsheetExportService.export(streetAgentReportExcelExportStrategy,
                new StreetAgentReportExcelExportStrategy.ReportExportSource(
                        report.overview(), report.agents(), report.stations()));
    }

    private StreetAgentReportAssembler.ReportView load(LocalDate from, LocalDate to, DailySalesReportStatus status) {
        validatePeriod(from, to);
        Set<DailySalesReportStatus> statuses = status == null
                ? EnumSet.allOf(DailySalesReportStatus.class)
                : EnumSet.of(status);
        StreetAgentReportQueryPort.Dataset dataset = streetAgentReportQueryPort.load(from, to, statuses);

        return StreetAgentReportAssembler.assemble(
                from, to, statuses.stream().map(Enum::name).sorted().toList(), dataset);
    }

    private void validatePeriod(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "street-agent report period must be valid");
        }
    }

    private SortSelection resolveSort(String sortBy, String direction, Set<String> allowedFields) {
        if (sortBy == null || sortBy.isBlank() || !allowedFields.contains(sortBy.trim())) {
            return new SortSelection(DEFAULT_SORT_FIELD, "desc");
        }
        return new SortSelection(sortBy.trim(), direction);
    }

    private Comparator<StreetAgentReportResponse.Agent> agentComparator(String field, String direction) {
        Comparator<StreetAgentReportResponse.Agent> comparator = switch (field) {
            case "agentName" -> Comparator.comparing(StreetAgentReportResponse.Agent::agentName, String.CASE_INSENSITIVE_ORDER);
            case "reportCount" -> Comparator.comparingLong(StreetAgentReportResponse.Agent::reportCount);
            case "allocatedQuantity" -> Comparator.comparingInt(StreetAgentReportResponse.Agent::allocatedQuantity);
            case "soldQuantity" -> Comparator.comparingInt(StreetAgentReportResponse.Agent::soldQuantity);
            case "returnedQuantity" -> Comparator.comparingInt(StreetAgentReportResponse.Agent::returnedQuantity);
            case "commissionPayable" -> Comparator.comparing(StreetAgentReportResponse.Agent::commissionPayable);
            case "agentCashRemitted" -> Comparator.comparing(StreetAgentReportResponse.Agent::agentCashRemitted);
            case "sellThroughRate" -> Comparator.comparing(StreetAgentReportResponse.Agent::sellThroughRate);
            default -> Comparator.comparing(StreetAgentReportResponse.Agent::grossSales);
        };
        return descending(direction) ? comparator.reversed() : comparator;
    }

    private Comparator<StreetAgentReportResponse.Station> stationComparator(String field, String direction) {
        Comparator<StreetAgentReportResponse.Station> comparator = switch (field) {
            case "stationName" -> Comparator.comparing(StreetAgentReportResponse.Station::stationName, String.CASE_INSENSITIVE_ORDER);
            case "allocatedQuantity" -> Comparator.comparingInt(StreetAgentReportResponse.Station::allocatedQuantity);
            case "soldQuantity" -> Comparator.comparingInt(StreetAgentReportResponse.Station::soldQuantity);
            case "returnedQuantity" -> Comparator.comparingInt(StreetAgentReportResponse.Station::returnedQuantity);
            case "sellThroughRate" -> Comparator.comparing(StreetAgentReportResponse.Station::sellThroughRate);
            default -> Comparator.comparing(StreetAgentReportResponse.Station::grossSales);
        };
        return descending(direction) ? comparator.reversed() : comparator;
    }

    private boolean descending(String direction) {
        return direction == null || !"asc".equalsIgnoreCase(direction.trim());
    }

    private <T> PageResponse<T> page(List<T> values, int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(size, 1);
        int fromIndex = Math.min((safePage - 1) * safeSize, values.size());
        int toIndex = Math.min(fromIndex + safeSize, values.size());
        return PageResponse.from(values.subList(fromIndex, toIndex), values.size(), safePage, safeSize);
    }

    private record SortSelection(String field, String direction) {
    }
}
