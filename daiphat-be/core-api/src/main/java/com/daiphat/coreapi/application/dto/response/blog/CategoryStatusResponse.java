package com.daiphat.coreapi.application.dto.response.blog;

import lombok.Builder;

@Builder
public record CategoryStatusResponse(
    String code,
    String name
) {}
