package com.daiphat.coreapi.application.dto.request.lotteries;

import lombok.Builder;

@Builder
public record UpdateLotteryResultDetailRequest(
        Long prizeStructureId,
        String winningNumber
) {}
