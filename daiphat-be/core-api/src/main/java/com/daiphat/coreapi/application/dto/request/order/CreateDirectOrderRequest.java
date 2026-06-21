package com.daiphat.coreapi.application.dto.request.order;

import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import jakarta.validation.constraints.Email;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record CreateDirectOrderRequest(
        UUID customerId,
        @NotBlank String name,
        String phone,
        @Email String email,
        @NotEmpty
        List<@Valid OrderTicketItemRequest> items,
        OrderReceiveType receiveType,
        String note,
        List<@Valid DirectOrderTransactionRequest> transactions
) {
}
