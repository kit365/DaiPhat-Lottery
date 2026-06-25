package com.daiphat.coreapi.application.dto.request.refund;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateOrderRefundRequest(
        @NotBlank(message = "Vui lòng nhập lý do hoàn tiền.")
        @Size(max = 500, message = "Lý do hoàn tiền không được vượt quá 500 ký tự.")
        String refundReason,
        @NotNull(message = "Vui lòng chọn tài khoản nhận hoàn tiền.")
        Long bankAccountId
) {
}
