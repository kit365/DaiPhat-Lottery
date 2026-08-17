package com.daiphat.coreapi.application.dto.response.admin;

import java.math.BigDecimal;

/**
 * Read model for the KPI cards on the admin ecommerce dashboard.
 *
 * <p>The values are calculated from persisted lottery/order/transaction data;
 * the response deliberately contains only the small summary needed by the
 * first dashboard section.</p>
 */
public record AdminEcommerceSummaryResponse(
        long totalTickets,
        long totalOrders,
        BigDecimal monthlyRevenue,
        BigDecimal revenueMonthPercent
) {
}
