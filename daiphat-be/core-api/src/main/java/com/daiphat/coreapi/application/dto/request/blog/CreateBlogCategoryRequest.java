package com.daiphat.coreapi.application.dto.request.blog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBlogCategoryRequest(
    @NotBlank(message = "Tên danh mục không được để trống")
    @Size(max = 100, message = "Tên danh mục không vượt quá 100 ký tự")
    String name,
    
    @Size(max = 100, message = "Slug không vượt quá 100 ký tự")
    String slug,
    
    Long parentId,
    
    @Size(max = 255, message = "Mô tả không vượt quá 255 ký tự")
    String description,
    
    Integer displayOrder,
    
    String status,
    String avatar
) {}
