package com.daiphat.coreapi.domain.model.blogs;

import com.daiphat.coreapi.domain.model.enums.blog.CategoryStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class BlogCategoryModel {
    private Long id;
    private BlogCategoryModel parent;
    private String name;
    private String slug;
    private String description;
    private Integer displayOrder;
    private boolean isDeleted;
    private CategoryStatus status;
    private String avatar;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
}
