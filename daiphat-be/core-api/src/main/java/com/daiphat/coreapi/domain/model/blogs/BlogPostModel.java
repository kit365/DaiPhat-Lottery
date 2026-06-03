package com.daiphat.coreapi.domain.model.blogs;

import com.daiphat.coreapi.domain.model.enums.blog.PostStatus;
import com.daiphat.coreapi.domain.model.enums.blog.PostType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
@Builder
public class BlogPostModel {
    private Long id;
    private BlogCategoryModel category;
    private PostType type;
    private String title;
    private String slug;
    private String summary;
    private String content;
    private String thumbnail;
    private LocalDateTime scheduledAt;
    private PostStatus status;
    private Integer viewCount;
    private LocalDateTime publishedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Set<BlogTagModel> tags;
    private boolean isDeleted;

    public void initializeForCreate() {
        if (this.viewCount == null) {
            this.viewCount = 0;
        }
        if (this.status == null) {
            this.status = PostStatus.DRAFT;
        }
        if (this.status == PostStatus.PUBLISHED && this.publishedAt == null) {
            this.publishedAt = LocalDateTime.now();
        }
    }
}
