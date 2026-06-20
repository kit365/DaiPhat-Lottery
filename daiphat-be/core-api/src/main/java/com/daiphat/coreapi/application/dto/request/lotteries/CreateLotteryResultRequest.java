package com.daiphat.coreapi.application.dto.request.lotteries;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Builder
public record CreateLotteryResultRequest(
        @NotNull(message = "Đài quay không được để trống")
        Long stationId,

        @NotNull(message = "Ngày quay không được để trống")
        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate drawDate,

        String source,
        Boolean isOfficial,
        String status,
        LocalDateTime publishedAt
) {}
