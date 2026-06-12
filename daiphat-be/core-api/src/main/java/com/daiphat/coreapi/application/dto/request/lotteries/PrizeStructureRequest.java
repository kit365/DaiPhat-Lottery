package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;
public record PrizeStructureRequest(
        Long id,
        String region,
        Boolean isOnly,
        String prizeLevel,
        String prizeDisplayName,
        String prizeCode,
        @DecimalMin(value = "0", message = "Giá trị giải thưởng phải lớn hơn hoặc bằng 0")
        BigDecimal prizeValue,
        @Min(value = 1, message = "Số lượng giải phải lớn hơn hoặc bằng 1")
        Integer quantity,
        Integer matchDigits,
        String matchFrom,
        String matchFromDisplayName,
        Integer displayOrder
) {}
