package com.daiphat.coreapi.application.dto.request.order;

import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateDirectOrderRequest(
        UUID customerId,
        @NotBlank String name,
        @NotBlank String phone,
        @NotEmpty
        @Size(min = 1, max = 10)
        List<Long> lotteryTicketIds,
        OrderReceiveType receiveType,
        String note,
        List<@Valid DirectOrderTransactionRequest> transactions
) {
}
