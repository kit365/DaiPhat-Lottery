package com.daiphat.coreapi.application.port.out.dashboard;

import com.daiphat.coreapi.application.dto.response.dashboard.StaffDashboardResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface StaffDashboardQueryPort {
    StaffDashboardResponse.TaskSummary loadTaskSummary(UUID actorId, LocalDate businessDate);
    StaffDashboardResponse.WorkItems loadWorkItems(UUID actorId, LocalDate businessDate,
                                                   String status, int page, int size);
    List<StaffDashboardResponse.RecentAction> loadRecentActions(UUID actorId, LocalDate businessDate);
    List<StaffDashboardResponse.InventoryAlert> loadInventoryAlerts(UUID actorId, LocalDate businessDate);
}
