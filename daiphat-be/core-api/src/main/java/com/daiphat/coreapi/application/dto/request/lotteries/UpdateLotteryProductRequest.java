package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMin;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
public record UpdateLotteryProductRequest(
        String name,

        String province,
        String region,

        String type,

        // Quy tắc số
        Integer numberLength,
        Integer minNumber,
        Integer maxNumber,

        @DecimalMin(value = "0", inclusive = false, message = "Giá phải lớn hơn 0")
        BigDecimal price,

        // Lịch quay
        String drawSchedule,
        String drawTime,
        LocalDate nextDrawDate,

        // Hiển thị
        String description,
        Integer displayOrder,
        String status
) {}
