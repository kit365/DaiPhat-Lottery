package com.daiphat.coreapi.application.dto.request.order;

import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import jakarta.validation.constraints.Email;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

public record CreateOnlineOrderRequest(
        @NotBlank String name,
        @NotBlank String phone,
        @Email String email,
        @NotEmpty
        List<@Valid OrderTicketItemRequest> items,
        OrderReceiveType receiveType,
        @NotNull LocalDateTime expectedPickupAt,
        String note
) {
}
