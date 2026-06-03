package com.daiphat.coreapi.domain.model.blogs;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class BlogTagModel {
    private Long id;
    private String name;
    private String slug;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
}
