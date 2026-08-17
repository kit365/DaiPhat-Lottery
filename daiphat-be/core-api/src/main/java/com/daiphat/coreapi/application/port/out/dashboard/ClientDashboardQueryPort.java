package com.daiphat.coreapi.application.port.out.dashboard;

import com.daiphat.coreapi.application.dto.response.dashboard.ClientDashboardResponse;

import java.util.List;
import java.util.UUID;

public interface ClientDashboardQueryPort {
    ClientDashboardResponse.Wallet loadWallet(UUID userId);
    List<ClientDashboardResponse.RecentOrder> loadRecentOrders(UUID userId);
    List<ClientDashboardResponse.TicketAlert> loadTicketAlerts(UUID userId);
    List<ClientDashboardResponse.OpenRequest> loadOpenRequests(UUID userId);
    List<ClientDashboardResponse.RecentNotification> loadRecentNotifications(UUID userId);
}
