package com.daiphat.coreapi.application.dto.request.refund;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequestBankInfoUpdateRequest(
        @NotBlank @Size(max = 1000) String operatorNote
) {
}
