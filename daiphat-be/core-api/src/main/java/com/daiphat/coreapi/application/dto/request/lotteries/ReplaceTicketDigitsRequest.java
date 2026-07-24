package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record ReplaceTicketDigitsRequest(
        @NotBlank(message = "Dãy số thay thế không được để trống")
        String newNumbers,

        String newTicketImg
) {
}
