package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;
@Builder
public record CreateLotteryTicketRequest(
        @NotNull(message = "Đài vé số không được để trống")
        Long stationId,

        @Valid
        @NotNull(message = "Danh sách sê-ri không được để trống")
        List<CreateLotteryTicketSerialRequest> serials,

        @NotBlank(message = "Dãy số không được để trống")
        String numbers,

        LocalDate drawDate,

        @NotNull(message = "Phiếu nhập lô không được để trống")
        Long importBatchLineId
) {
}
