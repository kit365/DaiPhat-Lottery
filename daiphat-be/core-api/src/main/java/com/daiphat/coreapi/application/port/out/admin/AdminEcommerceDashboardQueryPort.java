package com.daiphat.coreapi.application.port.out.admin;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Persistence-facing read port for admin ecommerce KPI aggregation. */
public interface AdminEcommerceDashboardQueryPort {

    long countActiveTicketProducts();

    long countOrders();

    BigDecimal sumCompletedOrderPayments(LocalDateTime fromInclusive, LocalDateTime toExclusive);
}
