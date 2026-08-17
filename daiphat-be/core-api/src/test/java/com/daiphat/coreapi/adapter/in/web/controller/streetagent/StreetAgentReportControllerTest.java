package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.application.dto.document.SpreadsheetDocument;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentReportResponse;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentReportServicePort;
import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StreetAgentReportControllerTest {

    private final LocalDate from = LocalDate.of(2026, 8, 1);
    private final LocalDate to = LocalDate.of(2026, 8, 31);
    private StreetAgentReportServicePort servicePort;
    private StreetAgentReportController controller;

    @BeforeEach
    void setUp() {
        servicePort = mock(StreetAgentReportServicePort.class);
        controller = new StreetAgentReportController(servicePort);
    }

    @Test
    void overview_and_breakdowns_forward_filter_and_pagination() {
        StreetAgentReportResponse.Overview overview = new StreetAgentReportResponse.Overview(
                new StreetAgentReportResponse.Period(from, to, List.of("OPEN")), 0, 0, 0, 0, false,
                new StreetAgentReportResponse.Summary(0, 0, 0, java.math.BigDecimal.ZERO,
                        java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO));
        when(servicePort.getOverview(from, to, DailySalesReportStatus.OPEN)).thenReturn(overview);
        when(servicePort.getAgents(from, to, DailySalesReportStatus.OPEN, 2, 5, "grossSales", "desc"))
                .thenReturn(PageResponse.from(List.of(), 0, 2, 5));
        when(servicePort.getStations(from, to, DailySalesReportStatus.OPEN, 2, 5, "grossSales", "desc"))
                .thenReturn(PageResponse.from(List.of(), 0, 2, 5));

        assertThat(controller.getOverview(from, to, DailySalesReportStatus.OPEN).getData()).isEqualTo(overview);
        assertThat(controller.getAgents(from, to, DailySalesReportStatus.OPEN, 2, 5, "grossSales", "desc")
                .getData().getPagination().getCurrentPage()).isEqualTo(2);
        assertThat(controller.getStations(from, to, DailySalesReportStatus.OPEN, 2, 5, "grossSales", "desc")
                .getData().getPagination().getCurrentPage()).isEqualTo(2);

        verify(servicePort).getOverview(from, to, DailySalesReportStatus.OPEN);
        verify(servicePort).getAgents(from, to, DailySalesReportStatus.OPEN, 2, 5, "grossSales", "desc");
        verify(servicePort).getStations(from, to, DailySalesReportStatus.OPEN, 2, 5, "grossSales", "desc");
    }

    @Test
    void export_uses_excel_attachment_headers() {
        when(servicePort.export(from, to, null)).thenReturn(
                new SpreadsheetDocument(new byte[]{1, 2, 3}, "bao-cao.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));

        var response = controller.export(from, to, null);

        assertThat(response.getHeaders().getContentType().toString())
                .isEqualTo("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        assertThat(response.getHeaders().getFirst("Content-Disposition"))
                .isEqualTo("attachment; filename=\"bao-cao.xlsx\"");
        assertThat(response.getBody()).containsExactly(1, 2, 3);
    }

    @Test
    void all_endpoints_require_dashboard_analytics_permission() throws NoSuchMethodException {
        for (var method : List.of(
                StreetAgentReportController.class.getMethod("getOverview", LocalDate.class, LocalDate.class, DailySalesReportStatus.class),
                StreetAgentReportController.class.getMethod("getAgents", LocalDate.class, LocalDate.class, DailySalesReportStatus.class,
                        int.class, int.class, String.class, String.class),
                StreetAgentReportController.class.getMethod("getStations", LocalDate.class, LocalDate.class, DailySalesReportStatus.class,
                        int.class, int.class, String.class, String.class),
                StreetAgentReportController.class.getMethod("export", LocalDate.class, LocalDate.class, DailySalesReportStatus.class))) {
            PreAuthorize authorization = method.getAnnotation(PreAuthorize.class);
            assertThat(authorization).isNotNull();
            assertThat(authorization.value()).isEqualTo("hasAuthority('dashboard:analytics')");
        }
    }
}
