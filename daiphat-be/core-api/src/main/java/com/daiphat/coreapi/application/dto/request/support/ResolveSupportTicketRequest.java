package com.daiphat.coreapi.application.dto.request.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResolveSupportTicketRequest(
        @NotBlank @Size(max = 2000) String response
) {
}
