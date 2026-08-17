package com.daiphat.coreapi.adapter.in.web.controller.dashboard;

import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.port.in.dashboard.admin.AdminDashboardActionItemServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.admin.AdminDashboardKpiServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.admin.AdminOrderStatusServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.admin.AdminRecentOrderServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.admin.AdminDailyRevenueServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.admin.AdminSerialStatusServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.admin.AdminTopStationSalesServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.admin.AdminInventoryRiskServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.admin.AdminReconciliationServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.admin.AdminVendorRiskServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.client.ClientNotificationDashboardServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.client.ClientOpenRequestServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.client.ClientRecentOrderServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.client.ClientTicketAlertServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.client.ClientWalletDashboardServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.staff.StaffInventoryAlertServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.staff.StaffRecentActionServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.staff.StaffTaskSummaryServicePort;
import com.daiphat.coreapi.application.port.in.dashboard.staff.StaffWorkQueueServicePort;
import com.daiphat.coreapi.shared.time.VietnamClock;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class DashboardControllerTest {

    private static final LocalDate VIETNAM_TODAY = LocalDate.of(2026, 8, 13);

    @Test
    void admin_kpis_defaults_business_date_from_vietnam_clock() {
        AdminDashboardKpiServicePort kpis = mock(AdminDashboardKpiServicePort.class);
        AdminOperationalDashboardController controller = new AdminOperationalDashboardController(
                vietnamClock(), kpis, mock(AdminOrderStatusServicePort.class), mock(AdminSerialStatusServicePort.class), mock(AdminTopStationSalesServicePort.class), mock(AdminRecentOrderServicePort.class), mock(AdminDailyRevenueServicePort.class), mock(AdminDashboardActionItemServicePort.class), mock(AdminInventoryRiskServicePort.class),
                mock(AdminVendorRiskServicePort.class), mock(AdminReconciliationServicePort.class));

        controller.getKpis(null);

        verify(kpis).getKpis(VIETNAM_TODAY);
    }

    @Test
    void admin_endpoints_keep_their_queries_independent_and_bound_the_reconciliation_limit() {
        LocalDate requestedDate = LocalDate.of(2026, 8, 20);
        AdminDashboardKpiServicePort kpis = mock(AdminDashboardKpiServicePort.class);
        AdminOrderStatusServicePort orderStatus = mock(AdminOrderStatusServicePort.class);
        AdminSerialStatusServicePort serialStatus = mock(AdminSerialStatusServicePort.class);
        AdminTopStationSalesServicePort topStationSales = mock(AdminTopStationSalesServicePort.class);
        AdminRecentOrderServicePort recentOrders = mock(AdminRecentOrderServicePort.class);
        AdminDailyRevenueServicePort dailyRevenue = mock(AdminDailyRevenueServicePort.class);
        AdminDashboardActionItemServicePort actionItems = mock(AdminDashboardActionItemServicePort.class);
        AdminInventoryRiskServicePort inventoryRisks = mock(AdminInventoryRiskServicePort.class);
        AdminVendorRiskServicePort vendorRisks = mock(AdminVendorRiskServicePort.class);
        AdminReconciliationServicePort reconciliations = mock(AdminReconciliationServicePort.class);
        AdminOperationalDashboardController controller = new AdminOperationalDashboardController(
                vietnamClock(), kpis, orderStatus, serialStatus, topStationSales, recentOrders, dailyRevenue, actionItems, inventoryRisks, vendorRisks, reconciliations);

        controller.getOrderStatus(requestedDate);
        controller.getSerialStatus(requestedDate);
        controller.getTopStations(requestedDate, 999);
        controller.getTopStations(requestedDate, requestedDate.minusDays(2), requestedDate, 3);
        controller.getRecentOrders(requestedDate, 999);
        controller.getDailyRevenue(requestedDate);
        controller.getActionItems(requestedDate);
        controller.getInventoryRisks(requestedDate);
        controller.getVendorRisks(requestedDate);
        controller.getReconciliations(requestedDate, 999);

        verify(orderStatus).getOrderStatusCounts(requestedDate);
        verify(serialStatus).getSerialStatusCounts(requestedDate);
        verify(topStationSales).getTopStationSales(requestedDate, requestedDate, 20);
        verify(topStationSales).getTopStationSales(requestedDate.minusDays(2), requestedDate, 3);
        verify(recentOrders).getRecentOrders(requestedDate, 50);
        verify(dailyRevenue).getDailyRevenue(requestedDate);
        verify(actionItems).getActionItems(requestedDate);
        verify(inventoryRisks).getInventoryRisks(requestedDate);
        verify(vendorRisks).getVendorRisks(requestedDate);
        verify(reconciliations).getReconciliations(requestedDate, 50);
    }

    @Test
    void staff_and_client_endpoints_forward_authenticated_user_only() {
        UUID userId = UUID.randomUUID();
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(userId, "operator");
        StaffTaskSummaryServicePort summary = mock(StaffTaskSummaryServicePort.class);
        StaffDashboardController staff = new StaffDashboardController(vietnamClock(), summary,
                mock(StaffWorkQueueServicePort.class), mock(StaffRecentActionServicePort.class), mock(StaffInventoryAlertServicePort.class));
        ClientWalletDashboardServicePort wallet = mock(ClientWalletDashboardServicePort.class);
        ClientDashboardController client = new ClientDashboardController(wallet, mock(ClientRecentOrderServicePort.class),
                mock(ClientTicketAlertServicePort.class), mock(ClientOpenRequestServicePort.class), mock(ClientNotificationDashboardServicePort.class));

        staff.taskSummary(principal, null);
        client.wallet(principal);

        verify(summary).getTaskSummary(userId, VIETNAM_TODAY);
        verify(wallet).getWallet(userId);
    }

    @Test
    void audiences_have_separate_security_boundaries() {
        assertThat(AdminOperationalDashboardController.class.getAnnotation(PreAuthorize.class).value())
                .isEqualTo("hasAnyAuthority('dashboard:system', 'dashboard:ecommerce')");
        assertThat(StaffDashboardController.class.getAnnotation(PreAuthorize.class).value())
                .isEqualTo("hasAuthority('dashboard:staff')");
        assertThat(ClientDashboardController.class.getAnnotation(PreAuthorize.class).value())
                .isEqualTo("isAuthenticated()");
    }

    private VietnamClock vietnamClock() {
        return new VietnamClock(Clock.fixed(Instant.parse("2026-08-12T18:00:00Z"), ZoneOffset.UTC));
    }
}
