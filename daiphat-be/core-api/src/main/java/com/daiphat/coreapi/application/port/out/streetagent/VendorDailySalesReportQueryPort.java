package com.daiphat.coreapi.application.port.out.streetagent;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.DailySalesReportResponse;

public interface VendorDailySalesReportQueryPort {
    boolean profileExists(Long profileId);

    PageResponse<DailySalesReportResponse> listByProfile(Long profileId, int page, int size);

    DailySalesReportResponse getById(Long reportId);
}
