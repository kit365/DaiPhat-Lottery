package com.daiphat.coreapi.adapter.in.web.controller.dashboard;
import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants; import com.daiphat.coreapi.adapter.in.web.response.ApiResponse; import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.response.dashboard.ClientDashboardResponse; import com.daiphat.coreapi.application.port.in.dashboard.client.*;
import lombok.RequiredArgsConstructor; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.annotation.AuthenticationPrincipal; import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping(ApiConstants.API_V1 + "/client/dashboard") @RequiredArgsConstructor @PreAuthorize("isAuthenticated()")
public class ClientDashboardController {
    private final ClientWalletDashboardServicePort wallet; private final ClientRecentOrderServicePort orders; private final ClientTicketAlertServicePort ticketAlerts; private final ClientOpenRequestServicePort openRequests; private final ClientNotificationDashboardServicePort notifications;
    @GetMapping("/wallet") public ApiResponse<ClientDashboardResponse.Wallet> wallet(@AuthenticationPrincipal AuthenticatedUserPrincipal p) { return ApiResponse.success(null, wallet.getWallet(p.getId())); }
    @GetMapping("/recent-orders") public ApiResponse<List<ClientDashboardResponse.RecentOrder>> orders(@AuthenticationPrincipal AuthenticatedUserPrincipal p) { return ApiResponse.success(null, orders.getRecentOrders(p.getId())); }
    @GetMapping("/ticket-alerts") public ApiResponse<List<ClientDashboardResponse.TicketAlert>> ticketAlerts(@AuthenticationPrincipal AuthenticatedUserPrincipal p) { return ApiResponse.success(null, ticketAlerts.getTicketAlerts(p.getId())); }
    @GetMapping("/open-requests") public ApiResponse<List<ClientDashboardResponse.OpenRequest>> openRequests(@AuthenticationPrincipal AuthenticatedUserPrincipal p) { return ApiResponse.success(null, openRequests.getOpenRequests(p.getId())); }
    @GetMapping("/recent-notifications") public ApiResponse<List<ClientDashboardResponse.RecentNotification>> notifications(@AuthenticationPrincipal AuthenticatedUserPrincipal p) { return ApiResponse.success(null, notifications.getRecentNotifications(p.getId())); }
}
