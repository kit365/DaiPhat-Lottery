package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;

public record UpdateLotteryTicketSerialRequest(
        Long id,
        String ticketImg,
        @NotBlank(message = "Số sê-ri không được để trống")
        String serialNumber
) {
}
