package com.daiphat.coreapi.application.dto.request.lotteries;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Builder
public record UpdateLotteryResultRequest(
        Long stationId,

        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate drawDate,

        String source,
        Boolean isOfficial,
        String status,
        LocalDateTime publishedAt
) {}
