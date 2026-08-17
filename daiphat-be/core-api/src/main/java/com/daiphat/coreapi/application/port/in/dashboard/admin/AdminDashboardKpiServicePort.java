package com.daiphat.coreapi.application.port.in.dashboard.admin;

import com.daiphat.coreapi.application.dto.response.dashboard.AdminDashboardResponse;
import java.time.LocalDate;
public interface AdminDashboardKpiServicePort { AdminDashboardResponse.Kpis getKpis(LocalDate businessDate); }
