package com.daiphat.coreapi.adapter.in.web.controller.admin;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.response.admin.AdminDashboardBadgeResponse;
import com.daiphat.coreapi.application.port.in.admin.AdminDashboardBadgeServicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/staff/admin-badges")
@RequiredArgsConstructor
public class StaffAdminDashboardController {

    private final AdminDashboardBadgeServicePort adminDashboardBadgeServicePort;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<AdminDashboardBadgeResponse> getAdminBadges(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Lấy số lượng badge admin thành công.",
                adminDashboardBadgeServicePort.getBadgeCounts(principal.getId())
        );
    }
}
