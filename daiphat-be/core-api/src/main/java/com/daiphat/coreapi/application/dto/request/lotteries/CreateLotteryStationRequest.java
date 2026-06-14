package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
public record CreateLotteryStationRequest(
        @NotBlank(message = "Tên sản phẩm không được để trống")
        String name,

        String province,
        String region,

        @NotBlank(message = "Loại vé không được để trống")
        String type,

        // Quy tắc số
        Integer numberLength,
        Integer minNumber,
        Integer maxNumber,

        @NotNull(message = "Giá không được để trống")
        @DecimalMin(value = "0", inclusive = false, message = "Giá phải lớn hơn 0")
        BigDecimal price,

        // Lịch quay
        String drawSchedule,
        String drawTime,
        LocalDate nextDrawDate,

        // Hiển thị
        String image,
        String description,
        Integer displayOrder
) {}