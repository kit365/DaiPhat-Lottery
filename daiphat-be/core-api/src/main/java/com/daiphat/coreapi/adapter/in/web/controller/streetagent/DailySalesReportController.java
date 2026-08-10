package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.DailySalesReportResponse;
import com.daiphat.coreapi.application.port.in.streetagent.VendorDailySalesReportServicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/daily-sales-reports")
@RequiredArgsConstructor
public class DailySalesReportController {

    private final VendorDailySalesReportServicePort vendorDailySalesReportServicePort;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('streetAgent:view', 'member:view')")
    public ApiResponse<DailySalesReportResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, vendorDailySalesReportServicePort.getById(id));
    }
}
