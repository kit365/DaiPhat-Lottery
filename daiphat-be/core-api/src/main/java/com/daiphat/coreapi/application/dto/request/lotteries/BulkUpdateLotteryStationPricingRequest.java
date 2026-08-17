package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record BulkUpdateLotteryStationPricingRequest(
        @NotEmpty @Valid List<UpdateLotteryStationPricingItem> items
) {
}
