package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

@Builder
public record ConfirmSyncLotteryStationsRequest(
        @NotNull(message = "Nguồn dữ liệu không được để trống.")
        LotteryStationSourceType source,

        @NotBlank(message = "Miền không được để trống.")
        String region,

        @NotNull(message = "Giá vé mặc định không được để trống.")
        @DecimalMin(value = "0", inclusive = false, message = "Giá vé mặc định phải lớn hơn 0.")
        BigDecimal defaultPrice,

        @NotEmpty(message = "Danh sách nhà đài đồng bộ không được để trống.")
        @Valid
        List<ConfirmSyncLotteryStationItem> items
) {
}
