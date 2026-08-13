package com.daiphat.coreapi.adapter.in.web.controller.admin;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.admin.AdminEcommerceSummaryResponse;
import com.daiphat.coreapi.application.port.in.admin.AdminEcommerceDashboardServicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1_ADMIN + "/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminEcommerceDashboardServicePort adminEcommerceDashboardServicePort;

    @GetMapping("/ecommerce/summary")
    @PreAuthorize("hasAuthority('dashboard:ecommerce')")
    public ApiResponse<AdminEcommerceSummaryResponse> getEcommerceSummary() {
        return ApiResponse.success(
                "Lấy KPI dashboard bán hàng thành công.",
                adminEcommerceDashboardServicePort.getSummary()
        );
    }
}
