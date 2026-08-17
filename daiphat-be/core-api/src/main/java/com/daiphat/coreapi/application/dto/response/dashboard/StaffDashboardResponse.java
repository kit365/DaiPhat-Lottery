package com.daiphat.coreapi.application.dto.response.dashboard;

import java.time.LocalDateTime;
import java.util.List;

public final class StaffDashboardResponse {
    private StaffDashboardResponse() { }

    public record TaskSummary(long pendingHandover, long returnEntry, long inspection,
                              long settlement, long overdue) { }
    public record WorkItem(String type, DashboardPriority priority, String entityType,
                           String entityId, String stationName, long ticketQuantity,
                           LocalDateTime deadlineAt, String status, boolean capable,
                           DashboardActionTarget target, LocalDateTime createdAt) { }
    public record WorkItems(List<WorkItem> items, long total, int page, int size) { }
    public record RecentAction(String type, String entityId, String title,
                               String status, LocalDateTime occurredAt,
                               DashboardActionTarget target) { }
    public record InventoryAlert(Long stationId, String stationName, long sellableQuantity,
                                 LocalDateTime deadlineAt, String severity,
                                 DashboardActionTarget target) { }
}
