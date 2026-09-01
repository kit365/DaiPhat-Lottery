package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdatePrizeClaimActualReceivedRequest(
        @DecimalMin(value = "0", message = "Số tiền thực nhận không được âm")
        @Digits(integer = 17, fraction = 2, message = "Số tiền thực nhận không hợp lệ")
        BigDecimal actualReceivedAmount,
        @Size(max = 500, message = "URL chứng từ không hợp lệ")
        String actualReceivedEvidenceUrl
) {
}
