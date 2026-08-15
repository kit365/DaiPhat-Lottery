package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SyncAction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

@Builder
public record ConfirmSyncLotteryStationItem(
        @NotBlank(message = "Tên nhà đài không được để trống.")
        String name,
        @NotBlank(message = "Tên chuẩn nhà đài không được để trống.")
        String canonicalName,
        /** Leave blank to have the system derive it from the name. */
        String code,
        @NotEmpty(message = "Ngày quay không được để trống.")
        List<String> drawDays,
        @NotBlank(message = "Giờ quay không được để trống.")
        String drawTime,
        BigDecimal commissionRate,
        @NotNull(message = "Hành động đồng bộ không được để trống.")
        SyncAction action,
        Long existingStationId
) {
}
