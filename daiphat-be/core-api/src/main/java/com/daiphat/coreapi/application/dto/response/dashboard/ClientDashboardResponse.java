package com.daiphat.coreapi.application.dto.response.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class ClientDashboardResponse {
    private ClientDashboardResponse() { }

    /** No wallet aggregate exists yet; balance is deliberately reported as unavailable. */
    public record Wallet(BigDecimal availableBalance, String status) { }
    public record RecentOrder(String orderId, String orderCode, BigDecimal totalAmount,
                              String status, LocalDateTime createdAt) { }
    public record TicketAlert(String type, String ticketNumber, LocalDate drawDate,
                              String message, DashboardActionTarget target) { }
    public record OpenRequest(String type, String requestId, String status,
                              LocalDateTime createdAt, DashboardActionTarget target) { }
    public record RecentNotification(Long id, String title, String content,
                                     boolean read, LocalDateTime createdAt,
                                     DashboardActionTarget target) { }
}
