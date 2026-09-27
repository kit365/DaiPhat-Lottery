package com.daiphat.coreapi.application.dto.request.refund;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyRefundCounterIdentityRequest(
        @NotBlank(message = "Cần ảnh CCCD mặt trước.") @Size(max = 500) String cccdFrontImageUrl,
        @NotBlank(message = "Cần ảnh CCCD mặt sau.") @Size(max = 500) String cccdBackImageUrl
) {
}
