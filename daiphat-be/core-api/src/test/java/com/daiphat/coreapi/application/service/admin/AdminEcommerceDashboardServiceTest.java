package com.daiphat.coreapi.application.service.admin;

import com.daiphat.coreapi.application.dto.response.admin.AdminEcommerceSummaryResponse;
import com.daiphat.coreapi.application.port.out.admin.AdminEcommerceDashboardQueryPort;
import com.daiphat.coreapi.shared.time.VietnamClock;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminEcommerceDashboardServiceTest {

    @Mock
    private AdminEcommerceDashboardQueryPort queryPort;

    @Test
    void builds_kpis_from_current_and_previous_vietnamese_calendar_month() {
        AdminEcommerceDashboardService service = serviceAt("2026-08-13T05:00:00Z");
        when(queryPort.countActiveTicketProducts()).thenReturn(12L);
        when(queryPort.countOrders()).thenReturn(7L);
        when(queryPort.sumCompletedOrderPayments(
                java.time.LocalDateTime.of(2026, 8, 1, 0, 0),
                java.time.LocalDateTime.of(2026, 9, 1, 0, 0)))
                .thenReturn(new BigDecimal("120.00"));
        when(queryPort.sumCompletedOrderPayments(
                java.time.LocalDateTime.of(2026, 7, 1, 0, 0),
                java.time.LocalDateTime.of(2026, 8, 1, 0, 0)))
                .thenReturn(new BigDecimal("100.00"));

        AdminEcommerceSummaryResponse result = service.getSummary();

        assertThat(result.totalTickets()).isEqualTo(12L);
        assertThat(result.totalOrders()).isEqualTo(7L);
        assertThat(result.monthlyRevenue()).isEqualByComparingTo("120.00");
        assertThat(result.revenueMonthPercent()).isEqualByComparingTo("20.00");
    }

    @Test
    void returns_zero_month_over_month_change_when_previous_month_has_no_revenue() {
        AdminEcommerceDashboardService service = serviceAt("2026-08-13T05:00:00Z");
        when(queryPort.sumCompletedOrderPayments(
                java.time.LocalDateTime.of(2026, 8, 1, 0, 0),
                java.time.LocalDateTime.of(2026, 9, 1, 0, 0)))
                .thenReturn(new BigDecimal("120.00"));
        when(queryPort.sumCompletedOrderPayments(
                java.time.LocalDateTime.of(2026, 7, 1, 0, 0),
                java.time.LocalDateTime.of(2026, 8, 1, 0, 0)))
                .thenReturn(BigDecimal.ZERO);

        assertThat(service.getSummary().revenueMonthPercent())
                .isEqualByComparingTo("0.00");
    }

    private AdminEcommerceDashboardService serviceAt(String instant) {
        VietnamClock vietnamClock = new VietnamClock(
                Clock.fixed(Instant.parse(instant), ZoneOffset.UTC));
        return new AdminEcommerceDashboardService(queryPort, vietnamClock);
    }
}
