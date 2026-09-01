package com.daiphat.coreapi.application.dto.response.admin;

import lombok.Builder;

/**
 * Aggregated sidebar/header badge counts for the admin shell.
 * Fields are {@code null} when the caller lacks permission for that metric.
 */
@Builder
public record AdminDashboardBadgeResponse(
        Long refundPending,
        Long prizePayoutPending,
        Long supportTicketOpen,
        Long returnBatchPending,
        Long ordersPreparing,
        Long chatAttention,
        Long notificationUnread,
        Long prizeClaimOutcomePending
) {
}
