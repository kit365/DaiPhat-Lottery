package com.daiphat.coreapi.application.port.out.dashboard;

import com.daiphat.coreapi.application.dto.response.dashboard.AdminDashboardResponse;

import java.time.LocalDate;
import java.util.List;

public interface AdminDashboardQueryPort {
    AdminDashboardResponse.Kpis loadKpis(LocalDate businessDate);
    List<AdminDashboardResponse.OrderStatusCount> loadOrderStatusCounts(LocalDate businessDate);
    List<AdminDashboardResponse.SerialStatusCount> loadSerialStatusCounts(LocalDate businessDate);
    default List<AdminDashboardResponse.TopStationSales> loadTopStationSales(LocalDate businessDate, int limit) {
        return loadTopStationSales(businessDate, businessDate, limit);
    }
    List<AdminDashboardResponse.TopStationSales> loadTopStationSales(LocalDate fromDate, LocalDate toDate, int limit);
    List<AdminDashboardResponse.RecentOrder> loadRecentOrders(LocalDate businessDate, int limit);
    List<AdminDashboardResponse.DailyRevenuePoint> loadDailyRevenue(LocalDate businessDate);
    List<AdminDashboardResponse.ActionItem> loadActionItems(LocalDate businessDate);
    List<AdminDashboardResponse.InventoryRisk> loadInventoryRisks(LocalDate businessDate);
    List<AdminDashboardResponse.VendorRisk> loadVendorRisks(LocalDate businessDate);
    List<AdminDashboardResponse.Reconciliation> loadReconciliations(LocalDate businessDate, int limit);
}
