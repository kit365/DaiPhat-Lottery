package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SyncAction;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

@Builder
public record ConfirmSyncLotteryStationItem(
        @NotBlank String name,
        @NotBlank String canonicalName,
        @NotNull List<String> drawDays,
        @NotBlank String drawTime,
        BigDecimal commissionRate,
        @NotNull SyncAction action,
        Long existingStationId
) {
}
