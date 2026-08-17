package com.daiphat.coreapi.application.port.in.dashboard.staff;
import com.daiphat.coreapi.application.dto.response.dashboard.StaffDashboardResponse;
import java.time.LocalDate; import java.util.List; import java.util.UUID;
public interface StaffRecentActionServicePort { List<StaffDashboardResponse.RecentAction> getRecentActions(UUID actorId, LocalDate businessDate); }
