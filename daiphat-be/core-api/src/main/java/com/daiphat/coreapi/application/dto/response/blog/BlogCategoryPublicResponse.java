package com.daiphat.coreapi.application.dto.response.blog;

import lombok.Builder;

@Builder
public record BlogCategoryPublicResponse(
    Long id,
    String name,
    String slug,
    String avatar,
    Long postCount
) {}
