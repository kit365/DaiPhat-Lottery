package com.daiphat.coreapi.application.dto.response.blog;

import lombok.Builder;

@Builder
public record BlogPostTypeResponse(
    String code,
    String name
) {}
