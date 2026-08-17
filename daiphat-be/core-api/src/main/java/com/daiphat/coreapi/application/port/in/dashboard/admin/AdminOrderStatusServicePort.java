package com.daiphat.coreapi.application.port.in.dashboard.admin;

import com.daiphat.coreapi.application.dto.response.dashboard.AdminDashboardResponse;

import java.time.LocalDate;
import java.util.List;

public interface AdminOrderStatusServicePort {
    List<AdminDashboardResponse.OrderStatusCount> getOrderStatusCounts(LocalDate businessDate);
}
