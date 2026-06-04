package com.daiphat.coreapi.application.dto.response.blog;

import lombok.Builder;
import java.time.LocalDateTime;

@Builder
public record BlogCategoryResponse(
    Long id,
    Long parentId,
    String parentName,
    String name,
    String slug,
    String description,
    Integer displayOrder,
    boolean isDeleted,
    String status,
    String avatar,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
