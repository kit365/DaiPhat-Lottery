package com.daiphat.coreapi.application.dto.response.blog;

import lombok.Builder;
import java.time.LocalDateTime;

@Builder
public record BlogTagResponse(
    Long id,
    String name,
    String slug,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    String createdBy,
    String lastModifiedBy
) {}
