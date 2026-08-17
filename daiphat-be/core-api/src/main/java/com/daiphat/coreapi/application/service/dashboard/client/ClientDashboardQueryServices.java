package com.daiphat.coreapi.application.service.dashboard.client;
import com.daiphat.coreapi.application.dto.response.dashboard.ClientDashboardResponse;
import com.daiphat.coreapi.application.port.in.dashboard.client.*;
import com.daiphat.coreapi.application.port.out.dashboard.ClientDashboardQueryPort;
import lombok.RequiredArgsConstructor; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class ClientDashboardQueryServices implements ClientWalletDashboardServicePort, ClientRecentOrderServicePort, ClientTicketAlertServicePort, ClientOpenRequestServicePort, ClientNotificationDashboardServicePort {
    private final ClientDashboardQueryPort queryPort;
    public ClientDashboardResponse.Wallet getWallet(UUID id) { return queryPort.loadWallet(id); }
    public List<ClientDashboardResponse.RecentOrder> getRecentOrders(UUID id) { return queryPort.loadRecentOrders(id); }
    public List<ClientDashboardResponse.TicketAlert> getTicketAlerts(UUID id) { return queryPort.loadTicketAlerts(id); }
    public List<ClientDashboardResponse.OpenRequest> getOpenRequests(UUID id) { return queryPort.loadOpenRequests(id); }
    public List<ClientDashboardResponse.RecentNotification> getRecentNotifications(UUID id) { return queryPort.loadRecentNotifications(id); }
}
