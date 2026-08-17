package com.daiphat.coreapi.application.service.dashboard.admin;

import com.daiphat.coreapi.application.dto.response.dashboard.AdminDashboardResponse;
import com.daiphat.coreapi.application.port.in.dashboard.admin.*;
import com.daiphat.coreapi.application.port.out.dashboard.AdminDashboardQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate; import java.util.List;

@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class AdminDashboardQueryServices implements AdminDashboardKpiServicePort, AdminDashboardActionItemServicePort,
        AdminInventoryRiskServicePort, AdminVendorRiskServicePort, AdminReconciliationServicePort,
        AdminOrderStatusServicePort, AdminRecentOrderServicePort, AdminDailyRevenueServicePort,
        AdminSerialStatusServicePort, AdminTopStationSalesServicePort {
    private final AdminDashboardQueryPort queryPort;
    public AdminDashboardResponse.Kpis getKpis(LocalDate date) { return queryPort.loadKpis(date); }
    public List<AdminDashboardResponse.OrderStatusCount> getOrderStatusCounts(LocalDate date) { return queryPort.loadOrderStatusCounts(date); }
    public List<AdminDashboardResponse.SerialStatusCount> getSerialStatusCounts(LocalDate date) { return queryPort.loadSerialStatusCounts(date); }
    public List<AdminDashboardResponse.TopStationSales> getTopStationSales(LocalDate fromDate, LocalDate toDate, int limit) {
        return queryPort.loadTopStationSales(fromDate, toDate, limit);
    }
    public List<AdminDashboardResponse.RecentOrder> getRecentOrders(LocalDate date, int limit) { return queryPort.loadRecentOrders(date, limit); }
    public List<AdminDashboardResponse.DailyRevenuePoint> getDailyRevenue(LocalDate date) { return queryPort.loadDailyRevenue(date); }
    public List<AdminDashboardResponse.ActionItem> getActionItems(LocalDate date) { return queryPort.loadActionItems(date); }
    public List<AdminDashboardResponse.InventoryRisk> getInventoryRisks(LocalDate date) { return queryPort.loadInventoryRisks(date); }
    public List<AdminDashboardResponse.VendorRisk> getVendorRisks(LocalDate date) { return queryPort.loadVendorRisks(date); }
    public List<AdminDashboardResponse.Reconciliation> getReconciliations(LocalDate date, int limit) { return queryPort.loadReconciliations(date, limit); }
}
