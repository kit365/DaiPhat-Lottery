package com.daiphat.coreapi.application.port.out.blog;

import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface BlogPostRepositoryPort {
    BlogPostModel save(BlogPostModel post);
    Optional<BlogPostModel> findById(Long id);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);

    Page<BlogPostModel> findAll(
            Pageable pageable,
            String search,
            Long tagId,
            Long categoryId,
            String type,
            String status,
            boolean includeDeleted
    );


    boolean existsById(Long id);

    void incrementViewCount(Long id);
    void incrementViewCountBy(Long id, Integer increment);

    void clearCategoryForPosts(List<Long> categoryIds);
    void removeTagFromPosts(Long tagId);

    long countPublishedPostsByCategoryId(Long categoryId);

    long countByStatus(String status);

    long countAll();

    int publishDueScheduledPosts(LocalDateTime now);

    List<Long> findDueScheduledPostIds(LocalDateTime now);
}
