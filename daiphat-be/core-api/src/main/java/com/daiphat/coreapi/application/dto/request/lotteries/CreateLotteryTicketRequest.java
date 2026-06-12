package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;
@Builder
public record CreateLotteryTicketRequest(
        @NotNull(message = "Sản phẩm vé số không được để trống")
        Long productId,

        String ticketImg,

        @NotBlank(message = "Số sê-ri không được để trống")
        String serialNumber,

        @NotBlank(message = "Dãy số không được để trống")
        String numbers,

        @NotNull(message = "Ngày quay không được để trống")
        LocalDate drawDate,

        @NotBlank(message = "Mã lô nhập không được để trống")
        String batchCode
) {}
