package com.daiphat.coreapi.application.dto.response.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class AdminDashboardResponse {
    private AdminDashboardResponse() { }

    public record Kpis(long soldTicketQuantity, BigDecimal ticketSalesRevenue,
                       BigDecimal reconciliationAmount, long actionItemCount) { }
    public record OrderStatusCount(String status, String label, long count) { }
    public record SerialStatusCount(String status, String label, long count) { }
    public record TopStationSales(Long stationId, String stationName, long soldQuantity) { }
    public record RecentOrder(String id, String orderCode, String customerName,
                              BigDecimal total, String status, LocalDateTime createdAt) { }
    public record DailyRevenuePoint(LocalDate date, BigDecimal amount) { }
    public record ActionItem(String type, DashboardPriority priority, long quantity,
                             LocalDateTime deadlineAt, DashboardActionTarget target) { }
    public record InventoryRisk(Long stationId, String stationName, LocalDate drawDate,
                                long sellableQuantity, long vendorHeldQuantity, String risk) { }
    public record VendorRisk(Long profileId, String vendorName, String batchCode,
                             long heldQuantity, LocalDateTime deadlineAt, String status) { }
    public record Reconciliation(String subjectType, String subjectName, Long settlementId,
                                 LocalDate periodFrom, LocalDate periodTo,
                                 BigDecimal discrepancyAmount, String status) { }
}
