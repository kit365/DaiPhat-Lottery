package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Teach the resolver a supplier's spelling of a station, captured when the
 * operator corrects an unmatched row in the preview.
 */
public record SaveLotteryStationAliasRequest(
        @NotBlank(message = "Tên trong tệp không được để trống")
        String rawName,

        @NotNull(message = "Nhà đài không được để trống")
        Long lotteryStationId
) {
}
