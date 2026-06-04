package com.daiphat.coreapi.application.dto.response.blog;

import lombok.Builder;

@Builder
public record BlogTagResponse(
    Long id,
    String name,
    String slug
) {}
