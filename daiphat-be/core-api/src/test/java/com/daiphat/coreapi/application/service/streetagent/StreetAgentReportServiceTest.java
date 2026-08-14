package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.document.SpreadsheetDocument;
import com.daiphat.coreapi.application.export.streetagent.StreetAgentReportExcelExportStrategy;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentReportQueryPort;
import com.daiphat.coreapi.application.service.document.SpreadsheetExportService;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StreetAgentReportServiceTest {

    private final LocalDate from = LocalDate.of(2026, 8, 1);
    private final LocalDate to = LocalDate.of(2026, 8, 31);
    private StreetAgentReportQueryPort queryPort;
    private SpreadsheetExportService spreadsheetExportService;
    private StreetAgentReportExcelExportStrategy excelExportStrategy;
    private StreetAgentReportService service;

    @BeforeEach
    void setUp() {
        queryPort = mock(StreetAgentReportQueryPort.class);
        spreadsheetExportService = mock(SpreadsheetExportService.class);
        excelExportStrategy = new StreetAgentReportExcelExportStrategy();
        service = new StreetAgentReportService(queryPort, spreadsheetExportService, excelExportStrategy);
    }

    @Test
    void overview_aggregates_reports_and_settlements_without_multiplying_sales() {
        when(queryPort.load(eq(from), eq(to), any())).thenReturn(dataset());

        var overview = service.getOverview(from, to, null);

        assertThat(overview.reportCount()).isEqualTo(2);
        assertThat(overview.openReportCount()).isEqualTo(1);
        assertThat(overview.finalizedReportCount()).isEqualTo(1);
        assertThat(overview.unsettledBatchCount()).isEqualTo(1);
        assertThat(overview.provisional()).isTrue();
        assertThat(overview.summary()).extracting(
                summary -> summary.allocatedQuantity(), summary -> summary.soldQuantity(),
                summary -> summary.returnedQuantity(), summary -> summary.grossSales(),
                summary -> summary.commissionPayable(), summary -> summary.agentCashRemitted(),
                summary -> summary.sellThroughRate())
                .containsExactly(15, 12, 3, new BigDecimal("120000"), new BigDecimal("12000"),
                        new BigDecimal("108000"), new BigDecimal("80.00"));
    }

    @Test
    void agent_breakdown_combines_settlement_money_by_agent_and_pages_sorted_records() {
        when(queryPort.load(eq(from), eq(to), any())).thenReturn(dataset());

        var response = service.getAgents(from, to, null, 1, 1, "agentName", "asc");

        assertThat(response.getRecordList()).singleElement().extracting(
                agent -> agent.agentName(), agent -> agent.reportCount(), agent -> agent.commissionPayable())
                .containsExactly("Nguyễn An", 1L, new BigDecimal("12000"));
        assertThat(response.getPagination().getTotalRecords()).isEqualTo(2);
        assertThat(response.getPagination().isLast()).isFalse();
    }

    @Test
    void stations_are_aggregated_from_report_details_only() {
        when(queryPort.load(eq(from), eq(to), any())).thenReturn(dataset());

        var response = service.getStations(from, to, DailySalesReportStatus.FINALIZED, 1, 10, "grossSales", "desc");

        assertThat(response.getRecordList()).extracting(
                station -> station.stationName(), station -> station.grossSales())
                .containsExactly(tuple("Đài A", new BigDecimal("100000")), tuple("Đài B", new BigDecimal("20000")));
    }

    @Test
    void rejects_an_invalid_period_before_querying_data() {
        assertThatThrownBy(() -> service.getOverview(to, from, null))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void export_uses_the_complete_filtered_breakdowns() {
        when(queryPort.load(eq(from), eq(to), any())).thenReturn(dataset());
        SpreadsheetDocument document = new SpreadsheetDocument(new byte[]{1, 2}, "report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        when(spreadsheetExportService.export(eq(excelExportStrategy), any())).thenReturn(document);

        var actual = service.export(from, to, DailySalesReportStatus.OPEN);

        assertThat(actual).isEqualTo(document);
        verify(spreadsheetExportService).export(eq(excelExportStrategy),
                org.mockito.ArgumentMatchers.<StreetAgentReportExcelExportStrategy.ReportExportSource>argThat(source ->
                        source.agents().size() == 2 && source.stations().size() == 2));
    }

    @Test
    void status_filter_is_forwarded_and_finalized_report_stays_provisional_when_batches_are_open() {
        var finalizedDataset = new StreetAgentReportQueryPort.Dataset(
                List.of(new StreetAgentReportQueryPort.ReportRow(1L, 10L, "Nguyễn An", from,
                        DailySalesReportStatus.FINALIZED, 10, 8, 2, new BigDecimal("100000"))),
                List.of(), List.of(), 2L);
        when(queryPort.load(eq(from), eq(to), eq(EnumSet.of(DailySalesReportStatus.FINALIZED))))
                .thenReturn(finalizedDataset);

        var overview = service.getOverview(from, to, DailySalesReportStatus.FINALIZED);

        assertThat(overview.provisional()).isTrue();
        assertThat(overview.unsettledBatchCount()).isEqualTo(2L);
        assertThat(overview.period().statuses()).containsExactly("FINALIZED");
        verify(queryPort).load(from, to, EnumSet.of(DailySalesReportStatus.FINALIZED));
    }

    @Test
    void invalid_sort_defaults_to_gross_sales_desc_and_normalizes_pagination() {
        when(queryPort.load(eq(from), eq(to), any())).thenReturn(dataset());

        var response = service.getAgents(from, to, null, 0, 0, "drop table", "asc");

        assertThat(response.getRecordList()).extracting(agent -> agent.agentName())
                .containsExactly("Nguyễn An");
        assertThat(response.getPagination().getCurrentPage()).isEqualTo(1);
        assertThat(response.getPagination().getLimit()).isEqualTo(1);
        assertThat(response.getPagination().getTotalRecords()).isEqualTo(2);
    }

    private StreetAgentReportQueryPort.Dataset dataset() {
        return new StreetAgentReportQueryPort.Dataset(
                List.of(
                        new StreetAgentReportQueryPort.ReportRow(1L, 10L, "Nguyễn An", from,
                                DailySalesReportStatus.FINALIZED, 10, 8, 2, new BigDecimal("100000")),
                        new StreetAgentReportQueryPort.ReportRow(2L, 11L, "Trần Bình", to,
                                DailySalesReportStatus.OPEN, 5, 4, 1, new BigDecimal("20000"))),
                List.of(
                        new StreetAgentReportQueryPort.StationRow(100L, "Đài A", 10, 8, 2, new BigDecimal("100000")),
                        new StreetAgentReportQueryPort.StationRow(101L, "Đài B", 5, 4, 1, new BigDecimal("20000"))),
                List.of(
                        new StreetAgentReportQueryPort.SettlementRow(10L, new BigDecimal("10000"), new BigDecimal("90000")),
                        new StreetAgentReportQueryPort.SettlementRow(10L, new BigDecimal("2000"), new BigDecimal("18000"))),
                1L);
    }

    private static org.assertj.core.groups.Tuple tuple(Object... values) {
        return org.assertj.core.groups.Tuple.tuple(values);
    }
}
