package com.daiphat.coreapi.application.dto.response.blog;

import lombok.Builder;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * Response DTO dùng cho danh sách bài viết (không bao gồm content để giảm payload).
 */
@Builder
public record BlogPostSummaryResponse(
    Long id,
    BlogCategoryResponse category,
    String type,
    String title,
    String slug,
    String summary,
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
