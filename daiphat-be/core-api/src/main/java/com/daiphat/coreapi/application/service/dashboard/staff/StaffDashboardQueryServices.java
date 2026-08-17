package com.daiphat.coreapi.application.service.dashboard.staff;
import com.daiphat.coreapi.application.dto.response.dashboard.StaffDashboardResponse;
import com.daiphat.coreapi.application.port.in.dashboard.staff.*;
import com.daiphat.coreapi.application.port.out.dashboard.StaffDashboardQueryPort;
import lombok.RequiredArgsConstructor; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class StaffDashboardQueryServices implements StaffTaskSummaryServicePort, StaffWorkQueueServicePort, StaffRecentActionServicePort, StaffInventoryAlertServicePort {
    private final StaffDashboardQueryPort queryPort;
    public StaffDashboardResponse.TaskSummary getTaskSummary(UUID id, LocalDate date) { return queryPort.loadTaskSummary(id, date); }
    public StaffDashboardResponse.WorkItems getWorkItems(UUID id, LocalDate date, String status, int page, int size) { return queryPort.loadWorkItems(id, date, status, page, size); }
    public List<StaffDashboardResponse.RecentAction> getRecentActions(UUID id, LocalDate date) { return queryPort.loadRecentActions(id, date); }
    public List<StaffDashboardResponse.InventoryAlert> getInventoryAlerts(UUID id, LocalDate date) { return queryPort.loadInventoryAlerts(id, date); }
}
