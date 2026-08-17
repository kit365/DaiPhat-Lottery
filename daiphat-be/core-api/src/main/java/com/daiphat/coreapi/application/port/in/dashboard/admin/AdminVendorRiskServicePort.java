package com.daiphat.coreapi.application.port.in.dashboard.admin;
import com.daiphat.coreapi.application.dto.response.dashboard.AdminDashboardResponse;
import java.time.LocalDate; import java.util.List;
public interface AdminVendorRiskServicePort { List<AdminDashboardResponse.VendorRisk> getVendorRisks(LocalDate businessDate); }
