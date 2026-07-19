package com.daiphat.coreapi.application.dto.request.chat;

import jakarta.validation.constraints.NotNull;

public record UpdateAiServiceStatusRequest(
        @NotNull(message = "Trạng thái AI không được để trống")
        Boolean enabled
) {
}
