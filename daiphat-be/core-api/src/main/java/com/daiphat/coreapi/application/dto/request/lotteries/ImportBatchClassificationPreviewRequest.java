package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;

@Builder
public record ImportBatchClassificationPreviewRequest(
        @NotNull(message = "Nhà đài không được để trống")
        Long lotteryStationId,

        @NotNull(message = "Ngày quay không được để trống")
        LocalDate drawDate,

        @NotNull(message = "Loại nhập lô không được để trống")
        ImportBatchImportMode importMode,

        Long excludeBatchId
) {
}
