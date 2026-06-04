package com.daiphat.coreapi.application.dto.request.blog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBlogTagRequest(
    @NotBlank(message = "Tên tag không được để trống")
    @Size(max = 50, message = "Tên tag không vượt quá 50 ký tự")
    String name,
    
    @Size(max = 50, message = "Slug không vượt quá 50 ký tự")
    String slug
) {}
