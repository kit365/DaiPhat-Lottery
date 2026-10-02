package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record ImportBatchLineSelectionSnapshotRequest(
        @NotNull Long id,
        @NotNull Long lotteryStationId,
        @NotNull ImportBatchLineStatus status,
        @NotNull Integer declareQuantity,
        @NotNull Integer totalQuantity,
        @NotNull BigDecimal importCost
) {
}
