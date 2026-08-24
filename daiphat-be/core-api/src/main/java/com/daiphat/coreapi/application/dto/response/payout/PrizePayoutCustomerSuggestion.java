package com.daiphat.coreapi.application.dto.response.payout;

import java.time.LocalDate;

public record PrizePayoutCustomerSuggestion(
        String displayName,
        String phone,
        String email,
        long orderCount,
        LocalDate lastOrderDate
) {
}
