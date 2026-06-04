package com.daiphat.coreapi.application.dto.response.blog;

import lombok.Builder;
import java.util.List;

@Builder
public record BlogCategoryTreeResponse(
    Long id,
    String label,
    Long value,
    List<BlogCategoryTreeResponse> children
) {}
