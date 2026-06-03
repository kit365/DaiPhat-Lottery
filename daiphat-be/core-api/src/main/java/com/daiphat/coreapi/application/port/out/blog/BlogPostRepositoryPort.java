package com.daiphat.coreapi.application.port.out.blog;

import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface BlogPostRepositoryPort {
    BlogPostModel save(BlogPostModel post);
    Optional<BlogPostModel> findById(Long id);
    boolean existsBySlug(String slug);

    /**
     * Tìm kiếm có phân trang + lọc dành cho trang quản trị.
     *
     * @param pageable       phân trang & sắp xếp
     * @param search         tìm theo tiêu đề (nullable)
     * @param tagId          lọc theo tag id (nullable)
     * @param categoryId     lọc theo category id (nullable)
     * @param type           lọc theo loại bài – code string (nullable)
     * @param status         lọc theo trạng thái – code string (nullable)
     * @param includeDeleted true = bao gồm bài đã xoá mềm
     */
    Page<BlogPostModel> findAll(
            Pageable pageable,
            String search,
            Long tagId,
            Long categoryId,
            String type,
            String status,
            boolean includeDeleted
    );

    /** Tăng viewCount bài viết thêm 1. */
    void incrementViewCount(Long id);
}

