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

        /** Leave blank to have the system derive it from the name. */
        String code,

        String province,
        String region,

        @NotNull(message = "Giá không được để trống")
        @DecimalMin(value = "0", inclusive = false, message = "Giá phải lớn hơn 0")
        BigDecimal price,

        @DecimalMin(value = "0", message = "Tỷ lệ hoa hồng phải từ 0 trở lên")
        @jakarta.validation.constraints.DecimalMax(value = "1", message = "Tỷ lệ hoa hồng không vượt quá 100%")
        BigDecimal commissionRate,

        // Lịch quay
        @NotNull(message = "Danh sách ngày quay không được để trống")
        List<DayOfWeek> drawDays,

        @NotNull(message = "Giờ quay không được để trống")
        @JsonFormat(pattern = "HH:mm")
        LocalTime drawTime,

        /** Null = use global PRIZE_REDEMPTION_OFFICIAL_DEADLINE_DAYS. */
        @jakarta.validation.constraints.Min(1)
        @jakarta.validation.constraints.Max(365)
        Integer prizeRedemptionOfficialDeadlineDays,

        // Hiển thị
        String image,
        String description
) {}
