package com.daiphat.coreapi.application.port.in.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogPostRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostSummaryResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostTypeResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.util.List;

public interface BlogPostServicePort {
    BlogPostResponse createPost(CreateBlogPostRequest request);
    StorageResult uploadImage(UploadRequest request, String folder);
    List<BlogPostTypeResponse> getBlogTypes();

    /**
     * Lấy danh sách bài viết cho trang quản trị, hỗ trợ tìm kiếm, lọc và phân trang.
     *
     * @param page           trang hiện tại (1-indexed)
     * @param limit          số bản ghi mỗi trang
     * @param search         tìm kiếm theo tiêu đề (nullable)
     * @param tagId          lọc theo tag id (nullable)
     * @param categoryId     lọc theo category id (nullable)
     * @param type           lọc theo loại bài – code string (nullable)
     * @param status         lọc theo trạng thái – code string (nullable)
     * @param sortBy         trường sắp xếp (viewCount | createdAt | status)
     * @param direction      chiều sắp xếp (asc | desc)
     * @param includeDeleted nếu true, bao gồm cả bài đã xoá mềm
     */
    PageResponse<BlogPostSummaryResponse> getPosts(
            int page,
            int limit,
            String search,
            Long tagId,
            Long categoryId,
            String type,
            String status,
            String sortBy,
            String direction,
            boolean includeDeleted
    );

    /**
     * Tăng lượt xem bài viết thêm 1 – gọi khi người dùng mở xem chi tiết.
     * Không yêu cầu authentication (public endpoint).
     *
     * @param id id bài viết
     */
    void incrementViewCount(Long id);
}


