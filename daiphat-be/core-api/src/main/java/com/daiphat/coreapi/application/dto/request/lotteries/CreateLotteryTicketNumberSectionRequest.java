package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateLotteryTicketNumberSectionRequest(
        @NotBlank(message = "Dãy số không được để trống")
        String numbers,

        @Valid
        @NotNull(message = "Danh sách sê-ri không được để trống")
        List<CreateLotteryTicketSerialRequest> serials
) {
}
