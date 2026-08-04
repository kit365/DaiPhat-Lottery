package com.daiphat.coreapi.application.dto.response.payout;

import java.math.BigDecimal;
import java.util.List;

public record PrizePayoutBatchCreateResponse(
        List<PrizePayoutRequestResponse> claims,
        BigDecimal totalNetAmount
) {
}
