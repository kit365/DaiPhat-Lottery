package com.daiphat.coreapi.application.dto.response.user;

import lombok.Builder;

@Builder
public record UserStatusResponse(
        String code,
        String name
) {
}
