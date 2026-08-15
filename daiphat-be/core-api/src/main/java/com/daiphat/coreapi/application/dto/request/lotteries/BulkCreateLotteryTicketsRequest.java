package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record BulkCreateLotteryTicketsRequest(
        @NotNull(message = "Đài vé số không được để trống")
        Long stationId,

        @NotNull(message = "Phiếu nhập lô không được để trống")
        Long importBatchLineId,

        LocalDate drawDate,

        @Valid
        @NotEmpty(message = "Phải có ít nhất một dãy số")
        List<CreateLotteryTicketNumberSectionRequest> tickets,

        Boolean isAutoSave,

        /** How these serials were entered; defaults to MANUAL when absent. */
        InputSource inputSource
) {
}
