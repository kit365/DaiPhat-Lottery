package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;

public record CreateLotteryTicketSerialRequest(
        String ticketImg,

        @NotBlank(message = "Số sê-ri không được để trống")
        String serialNumber
) {
}
