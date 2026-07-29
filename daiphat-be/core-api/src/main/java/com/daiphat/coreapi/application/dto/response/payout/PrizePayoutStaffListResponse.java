package com.daiphat.coreapi.application.dto.response.payout;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;

import java.math.BigDecimal;

public record PrizePayoutStaffListResponse(
        PageResponse<PrizePayoutRequestResponse> page,
        long pendingCount,
        BigDecimal pendingGrossTotal
) {
}
