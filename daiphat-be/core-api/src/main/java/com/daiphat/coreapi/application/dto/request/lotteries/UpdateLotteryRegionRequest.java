package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record UpdateLotteryRegionRequest(
        @NotNull(message = "Số nhỏ nhất không được để trống")
        @Min(value = 0, message = "Số nhỏ nhất phải lớn hơn hoặc bằng 0")
        Integer minNumber,

        @NotNull(message = "Số lớn nhất không được để trống")
        @Min(value = 0, message = "Số lớn nhất phải lớn hơn hoặc bằng 0")
        Integer maxNumber
) {
}
