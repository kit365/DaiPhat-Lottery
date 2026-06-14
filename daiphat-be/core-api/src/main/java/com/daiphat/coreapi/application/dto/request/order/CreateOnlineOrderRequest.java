package com.daiphat.coreapi.application.dto.request.order;

import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public record CreateOnlineOrderRequest(
        @NotBlank String name,
        @NotBlank String phone,
        @NotEmpty
        @Size(min = 1, max = 10)
        List<Long> lotteryTicketIds,
        OrderReceiveType receiveType,
        @NotNull LocalDateTime expectedPickupAt,
        String note
) {
}
