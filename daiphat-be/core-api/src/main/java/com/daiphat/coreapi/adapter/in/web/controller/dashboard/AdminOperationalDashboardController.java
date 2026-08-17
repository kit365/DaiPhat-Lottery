package com.daiphat.coreapi.adapter.in.web.controller.dashboard;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.dashboard.AdminDashboardResponse;
import com.daiphat.coreapi.application.port.in.dashboard.admin.*;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate; import java.util.List;

@RestController @RequestMapping(ApiConstants.API_V1 + "/admin/dashboard") @RequiredArgsConstructor
// The operational dashboard is exposed from the existing Bán hàng screen.
// Keep system access for administrators, but also allow the dedicated
// dashboard:ecommerce permission used by that screen instead of making users
// hold an unrelated system-dashboard permission.
@PreAuthorize("hasAnyAuthority('dashboard:system', 'dashboard:ecommerce')")
public class AdminOperationalDashboardController {
    private final VietnamClock vietnamClock;
    private final AdminDashboardKpiServicePort kpis;
    private final AdminOrderStatusServicePort orderStatus;
    private final AdminSerialStatusServicePort serialStatus;
    private final AdminTopStationSalesServicePort topStationSales;
    private final AdminRecentOrderServicePort recentOrders;
    private final AdminDailyRevenueServicePort dailyRevenue;
    private final AdminDashboardActionItemServicePort actionItems;
    private final AdminInventoryRiskServicePort inventoryRisks;
    private final AdminVendorRiskServicePort vendorRisks;
    private final AdminReconciliationServicePort reconciliations;
    @GetMapping("/kpis") public ApiResponse<AdminDashboardResponse.Kpis> getKpis(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) { return ApiResponse.success(null, kpis.getKpis(orToday(businessDate))); }
    @GetMapping("/order-status") public ApiResponse<List<AdminDashboardResponse.OrderStatusCount>> getOrderStatus(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) { return ApiResponse.success(null, orderStatus.getOrderStatusCounts(orToday(businessDate))); }
    @GetMapping("/serial-status") public ApiResponse<List<AdminDashboardResponse.SerialStatusCount>> getSerialStatus(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) { return ApiResponse.success(null, serialStatus.getSerialStatusCounts(orToday(businessDate))); }
    @GetMapping("/top-stations") public ApiResponse<List<AdminDashboardResponse.TopStationSales>> getTopStations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "5") int limit
    ) {
        LocalDate end = toDate != null ? toDate : orToday(businessDate);
        LocalDate start = fromDate != null ? fromDate : end;
        if (start.isAfter(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fromDate must not be after toDate");
        }
        if (end.minusDays(365).isAfter(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date range must not exceed 366 days");
        }
        return ApiResponse.success(null, topStationSales.getTopStationSales(start, end, Math.min(Math.max(limit, 1), 20)));
    }

    /** Source-compatible entry point for callers that still request one business date. */
    public ApiResponse<List<AdminDashboardResponse.TopStationSales>> getTopStations(LocalDate businessDate, int limit) {
        return getTopStations(businessDate, null, null, limit);
    }
    @GetMapping("/recent-orders") public ApiResponse<List<AdminDashboardResponse.RecentOrder>> getRecentOrders(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate, @RequestParam(defaultValue = "6") int limit) { return ApiResponse.success(null, recentOrders.getRecentOrders(orToday(businessDate), Math.min(Math.max(limit, 1), 50))); }
    @GetMapping("/daily-revenue") public ApiResponse<List<AdminDashboardResponse.DailyRevenuePoint>> getDailyRevenue(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) { return ApiResponse.success(null, dailyRevenue.getDailyRevenue(orToday(businessDate))); }
    @GetMapping("/action-items") public ApiResponse<List<AdminDashboardResponse.ActionItem>> getActionItems(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) { return ApiResponse.success(null, actionItems.getActionItems(orToday(businessDate))); }
    @GetMapping("/inventory-risks") public ApiResponse<List<AdminDashboardResponse.InventoryRisk>> getInventoryRisks(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) { return ApiResponse.success(null, inventoryRisks.getInventoryRisks(orToday(businessDate))); }
    @GetMapping("/vendor-risks") public ApiResponse<List<AdminDashboardResponse.VendorRisk>> getVendorRisks(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) { return ApiResponse.success(null, vendorRisks.getVendorRisks(orToday(businessDate))); }
    @GetMapping("/reconciliations") public ApiResponse<List<AdminDashboardResponse.Reconciliation>> getReconciliations(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate, @RequestParam(defaultValue = "5") int limit) { return ApiResponse.success(null, reconciliations.getReconciliations(orToday(businessDate), Math.min(Math.max(limit, 1), 50))); }
    private LocalDate orToday(LocalDate value) { return value == null ? vietnamClock.today() : value; }
}
