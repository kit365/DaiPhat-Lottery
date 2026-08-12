package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.DailySalesReportResponse;
import com.daiphat.coreapi.application.port.in.streetagent.VendorDailySalesReportServicePort;
import com.daiphat.coreapi.application.port.out.streetagent.VendorDailySalesReportQueryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VendorDailySalesReportService implements VendorDailySalesReportServicePort {

    private final VendorDailySalesReportQueryPort vendorDailySalesReportQueryPort;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DailySalesReportResponse> listByProfile(Long profileId, int page, int size) {
        if (!vendorDailySalesReportQueryPort.profileExists(profileId)) {
            throw new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND);
        }
        return vendorDailySalesReportQueryPort.listByProfile(profileId, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public DailySalesReportResponse getById(Long reportId) {
        return vendorDailySalesReportQueryPort.getById(reportId);
    }
}
