package com.daiphat.coreapi.application.dto.request.lotteries;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

@Builder
public record CreateLotteryStationRequest(
        @NotBlank(message = "Tên sản phẩm không được để trống")
        String name,

        String province,
        String region,

        @NotNull(message = "Giá không được để trống")
        @DecimalMin(value = "0", inclusive = false, message = "Giá phải lớn hơn 0")
        BigDecimal price,

        // Lịch quay
        @NotNull(message = "Danh sách ngày quay không được để trống")
        List<DayOfWeek> drawDays,

        @NotNull(message = "Giờ quay không được để trống")
        @JsonFormat(pattern = "HH:mm")
        LocalTime drawTime,

        // Hiển thị
        String image,
        String description,
        String status
) {}
