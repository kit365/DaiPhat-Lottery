package com.daiphat.coreapi.application.dto.response.blog;

import lombok.Builder;

@Builder
public record BlogPostStatusResponse(
    String code,
    String name
) {}
