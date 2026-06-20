package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record CreateLotteryResultDetailRequest(
        @NotNull(message = "Cấu trúc giải thưởng không được để trống")
        Long prizeStructureId,

        @NotBlank(message = "Dãy số trúng không được để trống")
        String winningNumber
) {}
