package com.daiphat.coreapi.application.port.in.dashboard.staff;
import com.daiphat.coreapi.application.dto.response.dashboard.StaffDashboardResponse;
import java.time.LocalDate; import java.util.UUID;
public interface StaffWorkQueueServicePort { StaffDashboardResponse.WorkItems getWorkItems(UUID actorId, LocalDate businessDate, String status, int page, int size); }
