package com.daiphat.coreapi.application.port.in.dashboard.admin;

import com.daiphat.coreapi.application.dto.response.dashboard.AdminDashboardResponse;

import java.time.LocalDate;
import java.util.List;

public interface AdminTopStationSalesServicePort {
    default List<AdminDashboardResponse.TopStationSales> getTopStationSales(LocalDate businessDate, int limit) {
        return getTopStationSales(businessDate, businessDate, limit);
    }

    List<AdminDashboardResponse.TopStationSales> getTopStationSales(
            LocalDate fromDate,
            LocalDate toDate,
            int limit
    );
}
