package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.DailySalesReportResponse;

public interface VendorDailySalesReportServicePort {
    PageResponse<DailySalesReportResponse> listByProfile(Long profileId, int page, int size);
    DailySalesReportResponse getById(Long reportId);
}
