package com.daiphat.coreapi.application.port.in.admin;

import com.daiphat.coreapi.application.dto.response.admin.AdminDashboardBadgeResponse;

import java.util.UUID;

public interface AdminDashboardBadgeServicePort {

    AdminDashboardBadgeResponse getBadgeCounts(UUID userId);
}
