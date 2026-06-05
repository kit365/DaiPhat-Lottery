package com.daiphat.coreapi.application.dto.request.blog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.Set;

@Builder
public record CreateBlogPostRequest(
    @NotNull(message = "Danh mục bài viết không được để trống")
    Long categoryId,
    
    @NotBlank(message = "Loại bài viết không được để trống")
    String type,
    
    @NotBlank(message = "Tiêu đề không được để trống")
    String title,
    
    @NotBlank(message = "Slug không được để trống")
    String slug,
    
    @Size(max = 500, message = "Mô tả ngắn không được vượt quá 500 ký tự")
    String summary,
    
    String content,
    String thumbnail,
    LocalDateTime scheduledAt,
    
    @NotBlank(message = "Trạng thái không được để trống")
    String status,
    
    Set<Long> tagIds
) {}
