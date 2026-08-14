package com.daiphat.coreapi.application.port.in.admin;

import com.daiphat.coreapi.application.dto.response.admin.AdminEcommerceSummaryResponse;

public interface AdminEcommerceDashboardServicePort {

    AdminEcommerceSummaryResponse getSummary();
}
