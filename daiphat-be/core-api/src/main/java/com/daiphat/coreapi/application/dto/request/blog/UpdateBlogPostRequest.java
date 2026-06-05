package com.daiphat.coreapi.application.dto.request.blog;

import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.Set;

@Builder
public record UpdateBlogPostRequest(
    Long categoryId,
    String type,
    String title,
    String slug,

    @Size(max = 500, message = "Mô tả ngắn không được vượt quá 500 ký tự")
    String summary,

    String content,
    String thumbnail,
    LocalDateTime scheduledAt,

    /** Chỉ cần gửi status khi muốn thay đổi trạng thái (publish/unpublish…). */
    String status,

    Set<Long> tagIds
) {}
