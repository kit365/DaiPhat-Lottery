package com.daiphat.coreapi.application.dto.request.refund;

import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateRefundRequestRequest(
        @NotNull RefundType refundType,
        @NotNull UUID orderId,
        Long orderDetailId,
        @NotNull @DecimalMin("1") BigDecimal refundAmount,
        @NotBlank @Size(max = 500) String refundReason,
        @NotNull Long bankAccountId
) {
}
