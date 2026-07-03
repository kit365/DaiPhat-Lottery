package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;

@Builder
public record ImportBatchClassificationPreviewRequest(
        @NotNull(message = "Ngày quay không được để trống")
        LocalDate drawDate,

        @NotNull(message = "Loại lô không được để trống")
        ImportBatchType requestedBatchType
) {
}
