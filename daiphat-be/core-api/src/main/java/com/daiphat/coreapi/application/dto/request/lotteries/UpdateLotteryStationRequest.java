package com.daiphat.coreapi.application.dto.request.lotteries;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMin;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

@Builder
public record UpdateLotteryStationRequest(
        String name,

        String province,
        String region,

        @DecimalMin(value = "0", inclusive = false, message = "Giá phải lớn hơn 0")
        BigDecimal price,

        // Lịch quay
        List<DayOfWeek> drawDays,

        @JsonFormat(pattern = "HH:mm")
        LocalTime drawTime,

        // Hiển thị
        String image,
        String description,
        String status
) {}
