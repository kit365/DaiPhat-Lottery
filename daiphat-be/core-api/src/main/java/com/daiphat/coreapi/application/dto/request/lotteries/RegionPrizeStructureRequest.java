package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record RegionPrizeStructureRequest(
        @NotBlank(message = "Bậc giải thưởng không được để trống")
        String prizeLevel,
        String prizeDisplayName,
        @NotBlank(message = "Mã giải thưởng không được để trống")
        String prizeCode,
        String description,
        @DecimalMin(value = "0", message = "Giá trị giải thưởng phải lớn hơn hoặc bằng 0")
        BigDecimal prizeValue,
        @Min(value = 1, message = "Số lượng giải phải lớn hơn hoặc bằng 1")
        Integer quantity,
        Integer matchDigits,
        @NotBlank(message = "Quy tắc so khớp không được để trống")
        String matchFrom,
        String matchFromDisplayName,
        Integer displayOrder,
        Boolean isActive
) {}
