package com.daiphat.coreapi.application.dto.response.payout;

import java.util.List;

public record PrizePayoutLookupResponse(
        List<PrizePayoutLookupItem> items
) {
}
