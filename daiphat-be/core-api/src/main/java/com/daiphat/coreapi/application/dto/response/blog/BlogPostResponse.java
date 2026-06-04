package com.daiphat.coreapi.application.dto.response.blog;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.Set;

@Builder
public record BlogPostResponse(
    Long id,
    BlogCategoryResponse category,
    String type,
    String title,
    String slug,
    String summary,
    String content,
    String thumbnail,
    LocalDateTime scheduledAt,
    String status,
    Integer viewCount,
    LocalDateTime publishedAt,
    String createdBy,
    String lastModifiedBy,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    Set<BlogTagResponse> tags,
    boolean isDeleted
) {}
